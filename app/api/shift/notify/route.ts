import { NextRequest } from "next/server";
import { clients } from "../stream/route";
import { log } from "@/utils/logger";

log("[notify] Route Handler LOADED"); // ★ SSR が読み込んだ瞬間に出る

export async function POST(req: NextRequest) {
  log("[notify] POST called");
  log("[notify] cookies:", req.cookies.getAll());

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

  log("[notify] POST END");

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
