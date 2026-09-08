// /pages/api/members/delete.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/utils/logger";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  log("--------------------------------------------------");
  log("[API] DELETE START");

  if (req.method !== "POST") {
    log("[API] ❌ Method not allowed:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // -----------------------------
  // ① Cookie 認証（admin_session）
  // -----------------------------
  const token = req.cookies["admin_session"];
  log("[API] admin_session token:", token);

  if (!token) {
    log("[API] ❌ No admin_session cookie");
    return res.status(401).json({ error: "Not authenticated" });
  }

  // -----------------------------
  // ② セッション確認
  // -----------------------------
  log("[API] Checking admin_sessions...");
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("admin_sessions")
    .select("admin_id")
    .eq("token", token)
    .maybeSingle();

  log("[API] admin_sessions result:", { session, sessionError });

  if (sessionError) {
    log("[API] ❌ admin_sessions error:", sessionError);
    return res.status(500).json({ error: sessionError.message });
  }

  if (!session) {
    log("[API] ❌ Invalid session (no row)");
    return res.status(401).json({ error: "Invalid session" });
  }

  // -----------------------------
  // ③ 管理者チェック
  // -----------------------------
  log("[API] Checking admins table...");
  const { data: admin, error: adminError } = await supabaseAdmin
    .from("admins")
    .select("id")
    .eq("id", session.admin_id)
    .maybeSingle();

  log("[API] admins result:", { admin, adminError });

  if (adminError) {
    log("[API] ❌ admins error:", adminError);
    return res.status(500).json({ error: adminError.message });
  }

  if (!admin) {
    log("[API] ❌ Not admin (no row)");
    return res.status(403).json({ error: "Not admin" });
  }

  // -----------------------------
  // ④ 削除処理（profiles）
  // -----------------------------
  const { id } = req.body;
  log("[API] delete target id:", id);

  if (!id) {
    log("[API] ❌ Missing id");
    return res.status(400).json({ error: "Missing id" });
  }

  log("[API] Deleting from profiles...");
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", id);

  log("[API] profiles delete result:", profileError);

  if (profileError) {
    log("[API] ❌ profiles delete error:", profileError);
    return res.status(500).json({ error: profileError.message });
  }

  // -----------------------------
  // ⑤ shift_sync_state から削除
  // -----------------------------
  log("[API] Deleting from shift_sync_state...");
  const { error: syncError } = await supabaseAdmin
    .from("shift_sync_state")
    .delete()
    .eq("user_id", id);

  log("[API] shift_sync_state delete result:", syncError);

  if (syncError) {
    log("[API] ❌ shift_sync_state delete error:", syncError);
    return res.status(500).json({ error: syncError.message });
  }

  log("[API] DELETE SUCCESS");
  log("--------------------------------------------------");

  return res.status(200).json({ success: true });
}
