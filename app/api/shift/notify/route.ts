import { NextRequest } from "next/server";
import { clients } from "../stream/route";

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log("[notify] body:", body);
  console.log("[notify] clients.length:", clients.length);

  const encoder = new TextEncoder();

  clients.forEach((controller, index) => {
    console.log("[notify] sending to client", index);
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify(body)}\n\n`)
    );
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
