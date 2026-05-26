// /pages/api/members/add.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ★ サービスロールキーを使う（RLS 無視できる）
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← これ！
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const accessToken = req.cookies["sb-access-token"];
  if (!accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // 認証ユーザーを取得
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: "Invalid user" });
  }

  const user = userData.user;

  // 管理者チェック（RLS 無視されるので確実に読める）
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return res.status(403).json({ error: "Not admin" });
  }

  const { name, discord_id } = req.body;

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
