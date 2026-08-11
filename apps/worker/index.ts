import { Prisma, prisma } from "@repo/db";
import { redis } from "@repo/redis";

async function executeJob(job: Prisma.JobGetPayload<{}>) {
  switch (job.type) {
    case "test":
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        message: "Job executed successfully",
        payload: job.payload,
      };

    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}

async function main() {
  console.log("Worker Started : ");
  while (true) {
    const front = await redis.brpop("job_queue", 0);

    if (!front) {
      continue;
    }

    const jobId = front[1];
    const job = await prisma.job.findUnique({
      where: {
        id: jobId,
      },
    });

    if (!job) {
      console.error("Job not found:", jobId);
      continue;
    }
    // queue: processing
    const claimedJob = await prisma.job.updateMany({
      where: {
        id: jobId,
        status: "QUEUED",
      },
      data: {
        status: "PROCESSING",
      },
    });
    if (claimedJob.count === 0) {
      console.log("Job was already claimed:", jobId);
      continue;
    }
    console.log("processing:", jobId);

    try {
      const result = await executeJob(job);
      await prisma.job.update({
        where: {
          id: jobId,
        },
        data: {
          status: "COMPLETED",
          result: result,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error occurred while processing job:", error);
      await prisma.job.update({
        where: {
          id: jobId,
        },
        data: {
          status: "FAILED",
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
        },
      });
    }

    console.log("Job received from queue:", front);
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
