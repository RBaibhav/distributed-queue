import express from "express";
import jobRouter from "./routes/job";

const PORT = 3000;
const app = express();

app.use(express.json());

app.use("/job", jobRouter);

app.listen(PORT, () => {
  console.log(`listening at port ${PORT}`);
});
