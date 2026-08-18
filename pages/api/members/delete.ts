// /pages/api/members/delete.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Missing id" });
  }

  // -----------------------------
  // ① profiles から削除
  // -----------------------------
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", id);

  if (profileError) {
    return res.status(500).json({ error: profileError.message });
  }

  // -----------------------------
  // ② shift_sync_state からも削除（ユーザー単位ロック行）
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
