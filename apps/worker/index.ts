import { Prisma, prisma } from "@repo/db";

async function claimNextJob() {
  const job = await prisma.job.findFirst({
    where: {
      status: "QUEUED",
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!job) return null;
  const result = await prisma.job.updateMany({
    where: {
      status: "QUEUED",
      id: job.id,
    },
    data: {
      status: "PROCESSING",
      updatedAt: new Date(),
    },
  });

  if (result.count == 0) return null;

  return prisma.job.findUnique({
    where: {
      id: job.id,
    },
  });
}

async function executeJob(job: Prisma.JobGetPayload<{}>) {
  switch (job.type) {
    case "test":
      return {
        message: "Job executed scussesfully",
        payload: job.payload,
      };
    default:
      throw new Error(`unknown job type ${job.type}`);
  }
}

async function main() {
  console.log("Worker Started : ");
  while (true) {
    const job = await claimNextJob();

    if (!job) {
      console.log("queue is empty or the job is already claimed");
      return;
    }

    console.log("procsessuing", job.id);
    try {
      const result = await executeJob(job);

      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          status: "COMPLETED",
          result,
        },
      });

      console.log(`job completed ${job.id}`);
    } catch (error) {
      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          status: "FAILED",
          error: {
            message: error instanceof Error ? error.message : "unknown error",
          },
        },
      });

      console.error(`job failed ${job.id}`, error);
    }
    
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
