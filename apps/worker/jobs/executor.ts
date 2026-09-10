import type { Prisma } from "@repo/db";


export async function executeJob(job: Prisma.JobGetPayload<{}>) {
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
