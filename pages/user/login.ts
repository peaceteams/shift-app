import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // -----------------------------
  // ① userId でユーザー検索
  // -----------------------------
  const { data: user, error: userError } = await supabaseAdmin
    .from("profiles")
    .select("id, password_hash")
    .eq("user_id", userId)
    .maybeSingle();

  console.log("user:", user);
  console.log("userError:", userError);

  if (!user) {
    return res.status(401).json({ error: "ユーザーIDまたはパスワードが違います" });
  }

  // -----------------------------
  // ② パスワード照合
  // -----------------------------
  const ok = await bcrypt.compare(password, user.password_hash);

  if (!ok) {
    return res.status(401).json({ error: "ユーザーIDまたはパスワードが違います" });
  }

  // -----------------------------
  // ③ セッション発行
  // -----------------------------
  const token = randomBytes(32).toString("hex");

  await supabaseAdmin.from("user_sessions").insert({
    token,
    user_id: user.id,
  });

  // -----------------------------
  // ④ Cookie 保存
  // -----------------------------
  res.setHeader(
    "Set-Cookie",
    serialize("user_session", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 一年間保持
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
  );

  return res.json({ ok: true });
}
