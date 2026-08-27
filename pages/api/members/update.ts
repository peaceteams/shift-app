// /pages/api/members/update.ts
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
  // ④ 更新処理（profiles）
  // -----------------------------
  const { id, name, discord_id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Missing id" });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({
      name,
      discord_id: discord_id || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, member: data });
}
