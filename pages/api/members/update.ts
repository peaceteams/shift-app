// /pages/api/members/update.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id, name, discord_id, user_id, password } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Missing id" });
  }

  // 更新データをまとめる
  const updateData: any = {
    name,
    discord_id: discord_id || null,
    user_id: user_id?.toString() ?? null,
  };

  // パスワードが入力されていたらハッシュ化して更新
  if (password && password.trim() !== "") {
    updateData.password_hash = await bcrypt.hash(password, 10);
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ member: data });
}
