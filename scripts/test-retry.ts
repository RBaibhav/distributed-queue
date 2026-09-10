const API_URL = "http://localhost:3000";

async function main() {
  const response = await fetch(`${API_URL}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "invalid",
      payload: {},
    }),
  });

  const data = await response.json();

  console.log("Created job:", data.id);

  const jobId = data.id;

  while (true) {
    const response = await fetch(`${API_URL}/jobs/${jobId}`);
    const { job } = await response.json();

    console.log({
      status: job.status,
      attemptCount: job.attemptCount,
      nextAttemptAt: job.nextAttemptAt,
    });

    if (job.status === "FAILED" || job.status === "COMPLETED") {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

main().catch(console.error);