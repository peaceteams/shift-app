// app/api/stream/route.ts
import { log } from "@/utils/logger";

// ★ SSR が評価できないように、グローバル状態を export しない
const _clients: ReadableStreamDefaultController[] = [];

log("[stream] Route Handler LOADED (SSR safe)");

export async function GET() {
  log("[stream] GET called");

  const stream = new ReadableStream({
    start(controller) {
      _clients.push(controller);
      log("[stream] client connected. total:", _clients.length);

      controller.enqueue(
        new TextEncoder().encode(
          `data: ${JSON.stringify({ type: "connected" })}\n\n`
        )
      );
    },
    cancel(controller) {
      const index = _clients.indexOf(controller);
      if (index !== -1) _clients.splice(index, 1);
      log("[stream] client disconnected. total:", _clients.length);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ★ notify 側から参照するための安全な getter
export function getClients() {
  return _clients;
}
