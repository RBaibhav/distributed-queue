import { prisma } from "@repo/db";
import { recoverExpiredJobs } from "./recovery/expired-jobs";
import { randomUUID } from "crypto";
import { redis } from "@repo/redis";
import { executeJob } from "./jobs/executor";
import { jobClaimer } from "./queue/claimer";
import { WORKER_ID } from "./config";


export async function startWorker() {
  console.log("Worker Started : ");

  // recovery
  setInterval(() => {
    recoverExpiredJobs().catch((e) => {
      console.error("Recovery Error", e);
    });
  }, 5000);

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
      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          status: "FAILED",
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
        },
      });
    }
  }
}
