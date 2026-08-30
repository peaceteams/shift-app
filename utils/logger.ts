export function log(...args: any[]) {
  if (process.env.NEXT_PUBLIC_LOG_MODE === "d") {
    log(...args);
  }
}
