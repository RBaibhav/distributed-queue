import { prisma } from "@repo/db";
import { redis } from "@repo/redis";
import { LEASE_DURATION, WORKER_ID } from "../config";

const blockingRedis = redis.duplicate();

export async function jobClaimer() {
     const front = await blockingRedis.brpop("job_queue", 0);

    if (!front) {
      return null;
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
    }
    console.log("processing:", jobId);

  return  job;

}