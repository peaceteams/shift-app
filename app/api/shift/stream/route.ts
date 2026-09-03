import { NextRequest } from "next/server";

const clients: ReadableStreamDefaultController[] = [];

export function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      clients.push(controller);
      console.log("[stream] client connected. total:", clients.length);

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
      console.log("[stream] client disconnected. total:", clients.length);
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

export { clients };
