// app/api/notify/route.ts
import { log } from "@/utils/logger";
import { getClients } from "../stream/route";

log("[notify] Route Handler LOADED (SSR safe)");

export async function POST(req: Request) {
  log("[notify] POST called");

  const body = await req.json();
  log("[notify] body:", body);

  const clients = getClients();
  log("[notify] clients.length:", clients.length);

  const encoder = new TextEncoder();

  clients.forEach((controller, index) => {
    log("[notify] sending to client", index);
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify(body)}\n\n`)
    );
  });

  log("[notify] POST END");

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
