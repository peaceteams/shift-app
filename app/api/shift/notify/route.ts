import { NextRequest } from "next/server";
import { clients } from "../stream/route";
import { log } from "@/utils/logger";

export async function POST(req: NextRequest) {
  const body = await req.json();
  log("[notify] body:", body);
  log("[notify] clients.length:", clients.length);

  const encoder = new TextEncoder();

  clients.forEach((controller, index) => {
    log("[notify] sending to client", index);
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify(body)}\n\n`)
    );
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}