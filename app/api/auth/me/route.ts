import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabase/client";

export async function GET(req: NextRequest) {
  const sessionToken = req.cookies.get("user_session")?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // user_session → user_id を取得
  const { data, error } = await supabaseClient
    .from("user_sessions")
    .select("user_id")
    .eq("token", sessionToken)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: data.user_id,
    },
  });
}
