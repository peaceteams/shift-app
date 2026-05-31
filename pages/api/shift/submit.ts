// /pages/api/shift/submit.ts
import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { parse } from "cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const cookies = parse(req.headers.cookie || "");
  const token = cookies["user_session"];

  if (!token) return res.status(401).json({ error: "Not logged in" });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // セッションから user_id を取得
  const { data: session } = await supabaseAdmin
    .from("user_sessions")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();

  if (!session) return res.status(401).json({ error: "Invalid session" });

  const { shifts } = req.body;

  // 既存削除 → 新規登録（上書き方式）
  await supabaseAdmin
    .from("shift_requests")
    .delete()
    .eq("user_id", session.user_id);

  const rows = Object.entries(shifts).map(([date, v]: any) => ({
    user_id: session.user_id,
    date,
    start_time: v.start,
    end_time: v.end,
  }));

  await supabaseAdmin.from("shift_requests").insert(rows);

  return res.json({ ok: true });
}
