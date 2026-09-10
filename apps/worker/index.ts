import { startWorker } from "./worker";

startWorker().catch((err) => {
  console.error(err);
  process.exit(1);
});
