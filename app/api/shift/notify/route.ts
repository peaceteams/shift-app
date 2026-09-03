import { NextRequest, NextResponse } from "next/server";
import { clients } from "../stream/route";
import { supabaseClient } from "@/lib/supabase/client";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const encoder = new TextEncoder();

  // 特定ユーザー通知
  if (body.targetUserId) {
    for (const conn of clients) {
      // sessionToken → user_id を取得
      const { data } = await supabaseClient
        .from("user_sessions")
        .select("user_id")
        .eq("token", conn.sessionToken)
        .single();

      if (data && data.user_id === body.targetUserId) {
        conn.controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(body)}\n\n`)
        );
      }
    }

    return NextResponse.json({ ok: true });
  }

  // 全員通知
  for (const conn of clients) {
    conn.controller.enqueue(
      encoder.encode(`data: ${JSON.stringify(body)}\n\n`)
    );
  }

  return NextResponse.json({ ok: true });
}
