// /pages/api/notify/send.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { sendToUser, sendToAdmin } from "@/lib/sse/server";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { target, user_id } = req.body;

  // 管理者 → ユーザーへ通知
  if (target === "user") {
    if (!user_id || typeof user_id !== "string") {
      return res.status(400).json({ error: "Missing user_id" });
    }

    sendToUser(user_id, {
      type: "shift_updated",
      user_id,
    });

    return res.status(200).json({ ok: true });
  }

  // ユーザー → 管理者へ通知
  if (target === "admin") {
    sendToAdmin({
      type: "shift_updated",
    });

    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Invalid target" });
}
