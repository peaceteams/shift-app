// /pages/api/shift/get.ts
import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { parse } from "cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parse(req.headers.cookie || "");
  const token = cookies["user_session"];

  if (!token) return res.status(401).json({ error: "Not logged in" });

  const { data: session } = await supabaseApi
    .from("user_sessions")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();

  if (!session) return res.status(401).json({ error: "Invalid session" });

  // ★ is_confirmed / is_holiday を追加
  const { data } = await supabaseApi
    .from("shift_requests")
    .select("date, start_time, end_time, is_confirmed, is_holiday")
    .eq("user_id", session.user_id);

  // フロントで扱いやすい形に変換
  const shifts: Record<
    string,
    { start: string; end: string; is_confirmed: boolean; is_holiday: boolean }
  > = {};

  data?.forEach((row) => {
    shifts[row.date] = {
      start: row.start_time,
      end: row.end_time,
      is_confirmed: row.is_confirmed ?? false,
      is_holiday: row.is_holiday ?? false,
    };
  });

  return res.json({ shifts });
}
