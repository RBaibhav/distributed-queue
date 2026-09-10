import { prisma } from "@repo/db";
import { redis } from "@repo/redis";

export async function schduleRetries() {
  while (true) {
    const now = new Date();

    const jobs = await prisma.job.findMany({
      where: {
        status: "QUEUED",
        nextAttemptAt: {
          lte: now,
        },
      },
      take: 10,
    });

    for (const job of jobs) {
      await redis.lpush("job_queue", job.id);

      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          nextAttemptAt: null,
        },
      });
    }

    await new Promise((resolver) => setTimeout(resolver, 500));
  }
}
