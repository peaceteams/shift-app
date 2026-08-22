// /pages/api/members/auth-sync.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { randomBytes } from "crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  // ① profiles から既存ユーザー取得
  const { data: user } = await supabaseAdmin
    .from("profiles")
    .select("id, user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const authUid = user.id; // profiles.id = auth.uid にする

  // ② 新しいパスワードを発行
  const rawPassword = randomBytes(8).toString("hex");

  // ③ Supabase Auth に影ユーザー作成
  const email = `${user.user_id}@local`;

  const { error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: rawPassword,
      id: authUid,
    });

  if (authError) {
    return res.status(500).json({ error: authError.message });
  }

  return res.status(200).json({
    ok: true,
    authUid,
    rawPassword,
  });
}
