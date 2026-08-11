const API_URL = "http://localhost:3000";
const TOTAL_JOBS = 20;

async function createJob() {
  const response = await fetch(`${API_URL}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "test",
      payload: {
        count: 100,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create job: ${response.status}`);
  }

  const data = await response.json();

  return data.id;
}

async function getJob(id: string) {
  const response = await fetch(`${API_URL}/jobs/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to get job ${id}`);
  }

  const data = await response.json();

  return data.job;
}

async function main() {
  console.log(`Creating ${TOTAL_JOBS} jobs...`);

  const jobIds: string[] = [];

  const start = performance.now();

  for (let i = 0; i < TOTAL_JOBS; i++) {
    const id = await createJob();
    jobIds.push(id);
  }

  console.log("All jobs submitted.");

  while (true) {
    let completed = 0;
    let failed = 0;

    for (const id of jobIds) {
      const job = await getJob(id);

      if (job.status === "COMPLETED") {
        completed++;
      }

      if (job.status === "FAILED") {
        failed++;
      }
    }

    console.log(
      `Completed: ${completed}/${TOTAL_JOBS}, Failed: ${failed}`
    );

    if (completed + failed === TOTAL_JOBS) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const end = performance.now();

  const seconds = (end - start) / 1000;
  const throughput = TOTAL_JOBS / seconds;

  console.log("\nBenchmark complete");
  console.log(`Jobs: ${TOTAL_JOBS}`);
  console.log(`Time: ${seconds.toFixed(2)} seconds`);
  console.log(`Throughput: ${throughput.toFixed(2)} jobs/sec`);
}

main().catch(console.error);