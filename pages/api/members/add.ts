// /pages/api/members/add.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("▶ API /members/add START");

  // -----------------------------
  // ① Cookie 認証（admin_session）
  // -----------------------------
  const token = req.cookies["admin_session"];
  console.log("admin_session exists:", !!token);

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Supabase（Service Role）
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // -----------------------------
  // ② セッション確認
  // -----------------------------
  const { data: session } = await supabaseAdmin
    .from("admin_sessions")
    .select("admin_id")
    .eq("token", token)
    .maybeSingle();

  console.log("session:", session);

  if (!session) {
    return res.status(401).json({ error: "Invalid session" });
  }

  // -----------------------------
  // ③ 管理者チェック（admins テーブル）
  // -----------------------------
  const { data: admin } = await supabaseAdmin
    .from("admins")
    .select("id")
    .eq("id", session.admin_id)
    .maybeSingle();

  console.log("admin:", admin);

  if (!admin) {
    return res.status(403).json({ error: "Not admin" });
  }

  // -----------------------------
  // ④ メンバー追加
  // -----------------------------
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, discord_id } = req.body;

  console.log("Insert payload:", { name, discord_id });

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("profiles")
    .insert({
      name,
      discord_id: discord_id || null,
    })
    .select()
    .single();

  console.log("insertError:", insertError);
  console.log("inserted:", inserted);

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  return res.status(200).json({ member: inserted });
}
