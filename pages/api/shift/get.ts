// /pages/api/shift/get.ts
import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { parse } from "cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parse(req.headers.cookie || "");
  const token = cookies["user_session"];

  if (!token) return res.status(401).json({ error: "Not logged in" });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: session } = await supabaseAdmin
    .from("user_sessions")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();

  if (!session) return res.status(401).json({ error: "Invalid session" });

  const { data } = await supabaseAdmin
    .from("shift_requests")
    .select("date, start_time, end_time")
    .eq("user_id", session.user_id);

  // フロントで扱いやすい形に変換
  const shifts: Record<string, { start: string; end: string }> = {};

  data?.forEach((row) => {
    shifts[row.date] = {
      start: row.start_time,
      end: row.end_time,
    };
  });

  return res.json({ shifts });
}
