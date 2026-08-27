import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { serialize } from "cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("▶ API /user/login START");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ error: "userId と password は必須です" });
  }

  // -----------------------------
  // ① userId でユーザー検索（自作認証）
  // -----------------------------
  const { data: user } = await supabaseAdmin
    .from("profiles")
    .select("id, password_hash")
    .eq("user_id", userId)
    .maybeSingle();

  if (!user) {
    return res.status(401).json({ error: "ユーザーIDまたはパスワードが違います" });
  }

  // -----------------------------
  // ② パスワード照合（自作認証）
  // -----------------------------
  const ok = await bcrypt.compare(password, user.password_hash);

  if (!ok) {
    return res.status(401).json({ error: "ユーザーIDまたはパスワードが違います" });
  }

  // -----------------------------
  // ③ 自作セッション発行
  // -----------------------------
  const token = randomBytes(32).toString("hex");

  await supabaseAdmin.from("user_sessions").insert({
    token,
    user_id: user.id, // profiles.id（UUID）
  });

  // -----------------------------
  // ④ Cookie 保存
  // -----------------------------
  res.setHeader(
    "Set-Cookie",
    serialize("user_session", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
  );

  return res.json({ ok: true });
}
