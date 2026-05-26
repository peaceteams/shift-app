import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { access_token, refresh_token } = req.body;

  if (!access_token) {
    return res.status(400).json({ error: "No token" });
  }

  res.setHeader("Set-Cookie", [
    serialize("sb-access-token", access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour
    }),
    serialize("sb-refresh-token", refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    }),
  ]);

  return res.status(200).json({ ok: true });
}
