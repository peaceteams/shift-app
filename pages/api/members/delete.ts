// /pages/api/members/delete.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
  // ④ 削除処理（profiles）
  // -----------------------------
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Missing id" });
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", id);

  if (profileError) {
    return res.status(500).json({ error: profileError.message });
  }

  // -----------------------------
  // ⑤ shift_sync_state から削除
  // -----------------------------
  const { error: syncError } = await supabaseAdmin
    .from("shift_sync_state")
    .delete()
    .eq("user_id", id);

  if (syncError) {
    return res.status(500).json({ error: syncError.message });
  }

  return res.status(200).json({ success: true });
}
