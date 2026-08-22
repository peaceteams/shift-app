// /pages/api/members/delete.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.body; // ← profiles.id（＝auth.uid）

  if (!id) {
    return res.status(400).json({ error: "Missing id" });
  }

  // -----------------------------
  // ① profiles 削除
  // -----------------------------
  const { error: deleteError } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return res.status(500).json({ error: deleteError.message });
  }

  // -----------------------------
  // ② Supabase Auth ユーザー削除
  // -----------------------------
  const { error: authDeleteError } =
    await supabaseAdmin.auth.admin.deleteUser(id);

  if (authDeleteError) {
    return res.status(500).json({ error: authDeleteError.message });
  }

  return res.status(200).json({ success: true });
}
