// /pages/api/members/add.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const accessToken = req.cookies["sb-access-token"];

  if (!accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // 認証ユーザーを取得
  const { data: user, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !user?.user) {
    return res.status(401).json({ error: "Invalid user" });
  }

  // 管理者チェック
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    return res.status(403).json({ error: "Not admin" });
  }

  // リクエストボディ
  const { name, discord_id } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  // メンバー追加
  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      name,
      discord_id: discord_id || null,
    })
    .select()
    .single();

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  return res.status(200).json({ member: inserted });
}
