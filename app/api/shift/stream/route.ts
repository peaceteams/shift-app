import { log } from "@/utils/logger";

log("[stream] LOADED (SSR safe)");

// export async function GET() {
//   log("[stream] GET called");

//   const stream = new ReadableStream({
//     start(controller) {
//       _clients.push(controller);
//       log("[stream] client connected. total:", _clients.length);

//       controller.enqueue(
//         new TextEncoder().encode(
//           `data: ${JSON.stringify({ type: "connected" })}\n\n`
//         )
//       );
//     },
//     cancel(controller) {
//       const index = _clients.indexOf(controller);
//       if (index !== -1) _clients.splice(index, 1);
//       log("[stream] client disconnected. total:", _clients.length);
//     },
//   });

//   return new Response(stream, {
//     headers: {
//       "Content-Type": "text/event-stream",
//       "Cache-Control": "no-cache",
//       Connection: "keep-alive",
//     },
//   });
// }

// export function getClients() {
//   return _clients;
// }

export function GET() {
  return new Response("debug", { status: 200 });
}
