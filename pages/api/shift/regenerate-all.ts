import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 全ユーザー取得
  const { data: users, error: usersError } = await supabaseAdmin
    .from("profiles")
    .select("id");

  if (usersError) {
    return res.status(500).json({ error: usersError.message });
  }

  // 全員分の token + URL を生成
  const updates = users.map((u) => {
    const token = crypto.randomBytes(32).toString("hex");
    return {
      user_id: u.id,
      token,
      used: false,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/shift/${token}`,
    };
  });

  // DB に upsert
  const { error } = await supabaseAdmin
    .from("shift_links")
    .upsert(updates);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // ★ 全員分の URL を返す
  return res.status(200).json({
    links: updates.map((u) => ({
      user_id: u.user_id,
      url: u.url,
    })),
  });
}
