// /pages/api/members/add.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ① 認証チェック用（anon key）
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ② DB操作用（service role key）
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const accessToken = req.cookies["sb-access-token"];
  if (!accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // 認証ユーザー取得（anon key）
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser(accessToken);

  if (userError || !userData?.user) {
    return res.status(401).json({ error: "Invalid user" });
  }

  const user = userData.user;

  // 管理者チェック（service role → RLS 無視）
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return res.status(403).json({ error: "Not admin" });
  }

  const { name, discord_id } = req.body;

  // メンバー追加（service role → RLS 無視）
  const { data: inserted, error: insertError } = await supabaseAdmin
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
