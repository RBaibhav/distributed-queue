import { prisma } from "@repo/db";
import { redis } from "@repo/redis";



export async function recoverExpiredJobs() {
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

    if (recovered.count > 0) {
      await redis.lpush("job_queue", job.id);
      console.log(`Recovered expired job: ${job.id}`);
    }
  }
}

