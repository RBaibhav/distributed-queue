import { prisma } from "@repo/db";
import { recoverExpiredJobs } from "./recovery/expired-jobs";
import { randomUUID } from "crypto";
import { redis } from "@repo/redis";
import { executeJob } from "./jobs/executor";
import { jobClaimer } from "./queue/claimer";
import { WORKER_ID } from "./config";
import { schduleRetries } from "./queue/schedular";
import { getRetryDelay } from "./retry/retry-policy";

export async function startWorker() {
  console.log("Worker Started : ");

  // recovery
  setInterval(() => {
    recoverExpiredJobs().catch((e) => {
      console.error("Recovery Error", e);
    });
  }, 5000);

  schduleRetries().catch((e) => {
    console.error("Schedular error", e);
  });

  while (true) {
    const job = await jobClaimer();

    if (!job) continue;

    try {
      const result = await executeJob(job);
      await prisma.job.update({
        where: {
          id: job.id,
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

      const now = new Date();

      if (job.attemptCount >= job.maxAttempts) {
        await prisma.job.updateMany({
          where: {
            id: job.id,
            status: "PROCESSING",
            workerId: WORKER_ID,
          },
          data: {
            status: "FAILED",
            error: {
              message: error instanceof Error ? error.message : String(error),
            },
            workerId: null,
            leaseUntil: null,
          },
        });
      } else {
        const retryDelay = getRetryDelay(job.attemptCount);

        await prisma.job.updateMany({
          where: {
            id: job.id,
            status: "PROCESSING",
            workerId: WORKER_ID,
          },
          data: {
            status: "QUEUED",
            error: {
              message: error instanceof Error ? error.message : String(error),
            },
            workerId: null,
            leaseUntil: null,
            nextAttemptAt: new Date(now.getTime() + retryDelay),
          },
        });
      }
    }
  }
}
