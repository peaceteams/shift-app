import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Cookie を削除
  res.setHeader(
    "Set-Cookie",
    serialize("user_session", "", {
      path: "/",
      maxAge: 0,
    })
  );

  return res.status(200).json({ ok: true });
}
