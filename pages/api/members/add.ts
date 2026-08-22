// /pages/api/members/add.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("▶ API /members/add START");

  // -----------------------------
  // ① Cookie 認証（admin_session）
  // -----------------------------
  const token = req.cookies["admin_session"];
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // -----------------------------
  // ② セッション確認
  // -----------------------------
  const { data: session } = await supabaseAdmin
    .from("admin_sessions")
    .select("admin_id")
    .eq("token", token)
    .maybeSingle();

  if (!session) {
    return res.status(401).json({ error: "Invalid session" });
  }

  // -----------------------------
  // ③ 管理者チェック
  // -----------------------------
  const { data: admin } = await supabaseAdmin
    .from("admins")
    .select("id")
    .eq("id", session.admin_id)
    .maybeSingle();

  if (!admin) {
    return res.status(403).json({ error: "Not admin" });
  }

  // -----------------------------
  // ④ メンバー追加処理
  // -----------------------------
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, discord_id, userId, password } = req.body;

  if (!name || !userId || !password) {
    return res.status(400).json({ error: "name, userId, password は必須です" });
  }

  // パスワードをハッシュ化（自作認証用）
  const passwordHash = await bcrypt.hash(password, 10);

  // -----------------------------
  // ⑤ Supabase Auth に影のユーザーを作成
  // -----------------------------
  const email = `${userId}@local`; // ダミーでOK

  const { data: authUser, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
    });

  if (authError) {
    console.error("Auth create error:", authError);
    return res.status(500).json({ error: "Auth user creation failed" });
  }

  const authUid = authUser.user.id; // ← これが profiles.id になる

  // -----------------------------
  // ⑥ profiles に挿入（id = auth.uid）
  // -----------------------------
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: authUid, // ← Auth の uid を使う
      name,
      discord_id: discord_id || null,
      user_id: userId.toString(), // 自作ログイン用ID
      password_hash: passwordHash, // 自作ログイン用パスワード
    })
    .select()
    .single();

  if (insertError) {
    console.error("profiles insert error:", insertError);

    // Auth側だけ作られてしまった場合は削除する
    await supabaseAdmin.auth.admin.deleteUser(authUid);

    return res.status(500).json({ error: insertError.message });
  }

  return res.status(200).json({
    ok: true,
    member: inserted,
    rawPassword: password,
  });
}
