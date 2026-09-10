const BASE_RETRY_DELAY = 1000;

export function getRetryDelay(attemptCount: number) {
  return BASE_RETRY_DELAY * Math.pow(2, attemptCount - 1);
}