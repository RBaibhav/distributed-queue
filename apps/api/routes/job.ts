import { prisma } from "@repo/db";
import { redis } from "@repo/redis";
import { Router } from "express";

const router = Router();

router.post("/", async (req, res) => {
  const { type, payload } = req.body;

  const job = await prisma.job.create({
    data: {
      type,
      payload,
    },
  });

  await redis.lpush("job_queue", job.id);
  res.status(200).send({
    id: job.id,
  });
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const job = await prisma.job.findFirst({
    where: {
      id: req.params.id,
    },
  });

  res.status(200).send({
    job,
  });
});

export default router;
