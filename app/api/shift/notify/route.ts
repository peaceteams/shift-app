import { NextRequest } from "next/server";
import { clients } from "../stream/route";
import { log } from "@/utils/logger";

export async function POST(req: NextRequest) {
  const body = await req.json();
  log("[notify] body:", body);

  const encoder = new TextEncoder();

  clients.forEach((conn, index) => {
    // 特定ユーザー通知
    if (body.targetUserId) {
      if (conn.userId === body.targetUserId) {
        log(`[notify] sending ONLY to ${conn.userId}`);
        conn.controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(body)}\n\n`)
        );
      }
      return;
    }

    // 全員通知
    log("[notify] sending to ALL:", index);
    conn.controller.enqueue(
      encoder.encode(`data: ${JSON.stringify(body)}\n\n`)
    );
  });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
