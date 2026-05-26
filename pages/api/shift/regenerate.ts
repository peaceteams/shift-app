import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "Missing user_id" });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 新しい token を生成
  const token = crypto.randomBytes(32).toString("hex");

  // 既存の token を上書き（再生成）
  const { data, error } = await supabaseAdmin
    .from("shift_links")
    .update({
      token,
      used: false,
    })
    .eq("user_id", user_id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/shift/${token}`;

  return res.status(200).json({ url, token });
}
