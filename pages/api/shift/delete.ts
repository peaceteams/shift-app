import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { parse } from "cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Cookie から token を取得
  const cookies = parse(req.headers.cookie || "");
  const token = cookies.token;

  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  // Supabase (service_role)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // token → profiles.id を取得
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("token", token)
    .single();

  if (profileError || !profile) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const { date } = req.body;

  // 削除
  const { error } = await supabase
    .from("shift_requests")
    .delete()
    .eq("user_id", profile.id)
    .eq("date", date);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
