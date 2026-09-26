// /pages/api/members/update.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";
import { log } from "@/utils/logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  log("▶ API /members/update START");

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
  // ④ 更新データ取得
  // -----------------------------
  const { id, name, userId, password } = req.body;

  if (!id) {
    return res.status(400).json({ error: "id は必須です" });
  }

  // -----------------------------
  // ⑤ 更新項目作成
  // -----------------------------
  const updateData: any = {};

  if (name !== undefined) {
    updateData.name = name;
  }

  if (userId !== undefined) {
    updateData.user_id = userId.toString();
  }

  if (password) {
    updateData.password_hash = await bcrypt.hash(password, 10);
  }

  // -----------------------------
  // ⑥ profiles 更新
  // -----------------------------
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("profiles")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("profiles update error:", updateError);

    return res.status(500).json({
      error: updateError.message,
    });
  }

  // -----------------------------
  // ⑦ 完了レスポンス
  // -----------------------------
  return res.status(200).json({
    ok: true,
    member: updated,
    rawPassword: password ?? null,
  });
}