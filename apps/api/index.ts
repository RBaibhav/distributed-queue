import express from "express";
import jobRouter from "./routes/job";
import { redis } from "@repo/redis";

redis.ping().then((result) => {
  console.log("Redis ping result:", result);
}).catch((error) => {
  console.error("Error pinging Redis:", error);
});


const PORT = 3000;
const app = express();

app.use(express.json());

app.use("/jobs", jobRouter);

app.listen(PORT, () => {
  console.log(`listening at port ${PORT}`);
});
