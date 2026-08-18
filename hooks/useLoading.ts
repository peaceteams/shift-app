import { useState } from "react";

export function useLoading() {
  const [loading, setLoading] = useState(false);

  async function wrap(fn: () => Promise<any>) {
    setLoading(true);
    const result = await fn();
    setLoading(false);
    return result;
  }

  return { loading, wrap };
}