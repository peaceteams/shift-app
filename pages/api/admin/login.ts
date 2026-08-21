import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { serialize } from "cookie";
import jwt from "jsonwebtoken";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password } = req.body;

  // 管理者レコードを取得（1件だけ）
  const { data: admin, error } = await supabaseApi
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

  // セッショントークン発行（従来の仕組み）
  const token = randomBytes(32).toString("hex");

  await supabaseApi.from("admin_sessions").insert({
    token,
    admin_id: admin.id,
  });

  // ★ JWT 発行（RLS 用）
  const adminJwt = jwt.sign(
    {
      sub: admin.id,   // admins.id の uuid
      role: "admin",   // 管理者判定
    },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  // Cookie に保存（JWT は httpOnly=false）
  res.setHeader("Set-Cookie", [
    serialize("admin_session", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    }),
    serialize("admin_jwt", adminJwt, {
      httpOnly: false, // フロントで読める必要がある
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    }),
  ]);

  return res.json({ ok: true });
}
