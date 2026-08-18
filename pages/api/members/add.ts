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

  // パスワードをハッシュ化
  const passwordHash = await bcrypt.hash(password, 10);

  // DB へ挿入
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("profiles")
    .insert({
      name,
      discord_id: discord_id || null,
      user_id: userId.toString(),
      password_hash: passwordHash,
    })
    .select()
    .single();

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  // -----------------------------
  // ⑤ shift_sync_state に行を追加（ユーザー単位ロック用）
  // -----------------------------
  const { error: syncError } = await supabaseAdmin
    .from("shift_sync_state")
    .insert({
      user_id: inserted.user_id, // profiles に入れた user_id を使う
      sync_locked: false,
      locked_by: null,
      locked_at: null,
    });

  if (syncError) {
    console.error("❌ sync table insert failed:", syncError);
    return res.status(500).json({ error: "Failed to create sync row" });
  }

  // -----------------------------
  // ⑥ 完了レスポンス
  // -----------------------------
  return res.status(200).json({
    ok: true,
    member: inserted,
    rawPassword: password,
  });
}
