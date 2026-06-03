import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { parse } from "cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Cookie から token を取得
  const cookies = parse(req.headers.cookie || "");
  const token = cookies.user_session;

  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. user_session から user_id（＝ profiles.id）を取得
  const { data: session, error: sessionError } = await supabase
    .from("user_sessions")
    .select("user_id")
    .eq("token", token)
    .single();

  if (sessionError || !session) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const userId = session.user_id;

  // 2. 削除処理
  const { date } = req.body;

  const { error } = await supabase
    .from("shift_requests")
    .delete()
    .eq("user_id", userId)
    .eq("date", date);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
