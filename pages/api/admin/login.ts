import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { serialize } from "cookie";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password } = req.body;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 管理者レコードを取得（1件だけ）
  const { data: admin, error } = await supabaseAdmin
    .from("admins")
    .select("id, password_hash")
    .single();

  if (!admin) {
    return res.status(400).json({ error: "管理者が存在しません" });
  }

  const ok = await bcrypt.compare(password, admin.password_hash);

  if (!ok) {
    return res.status(401).json({ error: "パスワードが違います" });
  }

  // セッショントークン発行
  const token = randomBytes(32).toString("hex");

  await supabaseAdmin.from("admin_sessions").insert({
    token,
    admin_id: admin.id,
  });

  // Cookie に保存
  res.setHeader(
    "Set-Cookie",
    serialize("admin_session", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7日
    })
  );

  return res.json({ ok: true });
}
