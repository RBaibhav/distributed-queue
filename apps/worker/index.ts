import { Prisma, prisma } from "@repo/db";
import { redis } from "@repo/redis";
import { randomUUID } from "crypto";

const WORKER_ID = randomUUID();
const LEASE_DURATION = 30_000;

const blockingRedis = redis.duplicate();

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

async function recoverExpiredJobs() {
  const now = new Date();

  const expiredJobs = await prisma.job.findMany({
    where: {
      status: "PROCESSING",
      leaseUntil: {
        lt: now,
      },
    },
    select: {
      id: true,
    },
  });

  if (expiredJobs.length > 0) {
    console.log(`[RECOVERY] Found ${expiredJobs.length} expired jobs`);
  }
  for (const job of expiredJobs) {
    const recovered = await prisma.job.updateMany({
      where: {
        id: job.id,
        status: "PROCESSING",
        leaseUntil: {
          lt: now,
        },
      },
      data: {
        status: "QUEUED",
        workerId: null,
        leaseUntil: null,
      },
    });

    console.log(`[RECOVERY] ${job.id} update count = ${recovered.count}`);

    if (recovered.count > 0) {
      await redis.lpush("job_queue", job.id);
      console.log(`Recovered expired job: ${job.id}`);
    }
  }
}

async function main() {
  console.log("Worker Started : ");

  // recovery
  setInterval(() => {
    recoverExpiredJobs().catch((e) => {
      console.error("Recovery Error", e);
    });
  }, 5000);

  while (true) {
    const front = await blockingRedis.brpop("job_queue", 0);

    if (!front) {
      continue;
    }

    const jobId = front[1];
    const job = await prisma.job.findUnique({
      where: {
        id: jobId,
        status: "QUEUED",
      },
    });

    if (!job) {
      console.error("Job not found:", jobId);
      continue;
    }

    const leaseUnitl = new Date(Date.now() + LEASE_DURATION);
    // queue: processing
    const claimedJob = await prisma.job.updateMany({
      where: {
        id: jobId,
        status: "QUEUED",
      },
      data: {
        status: "PROCESSING",
        workerId: WORKER_ID,
        leaseUntil: leaseUnitl,
      },
    });
    console.log(
      `=================WORKER_ID: ${WORKER_ID} ========== leaseUnitl ${leaseUnitl}`,
    );

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
          status: "PROCESSING",
          workerId: WORKER_ID,
        },
        data: {
          status: "COMPLETED",
          result: result,
          completedAt: new Date(),
          workerId: null,
          leaseUntil: null,
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
