// /pages/api/members/add.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";
import { log } from "@/utils/logger";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  log("▶ API /members/add START");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
  const { name, userId, password } = req.body;

  if (!name || !userId || !password) {
    return res.status(400).json({ error: "name, userId, password は必須です" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // -----------------------------
  // ⑤ profiles に挿入
  // -----------------------------
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("profiles")
    .insert({
      name,
      user_id: userId.toString(),
      password_hash: passwordHash,
    })
    .select()
    .single();

  if (insertError) {
    console.error("profiles insert error:", insertError);
    return res.status(500).json({ error: insertError.message });
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
