import { NextRequest } from "next/server";
import { log } from "@/utils/logger";

log("[stream] Route Handler LOADED"); // ★ SSR が読み込んだ瞬間に出る

const clients: ReadableStreamDefaultController[] = [];

export function GET(req: NextRequest) {
  log("[stream] GET called");
  log("[stream] cookies:", req.cookies.getAll());

  const stream = new ReadableStream({
    start(controller) {
      clients.push(controller);
      log("[stream] client connected. total:", clients.length);

      controller.enqueue(
        new TextEncoder().encode(
          `data: ${JSON.stringify({ type: "connected" })}\n\n`
        )
      );
    },
    cancel(controller) {
      const index = clients.indexOf(controller);
      if (index !== -1) {
        clients.splice(index, 1);
      }
      log("[stream] client disconnected. total:", clients.length);
    },
  });

  log("[stream] returning SSE stream");

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export { clients };
