import type { NextApiRequest, NextApiResponse } from "next";
import { clients } from "./stream"; // 🔥 正しく import

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const body = req.body;

  // 🔥 型を明示することでエラー解消
  clients.forEach((client: NextApiResponse) => {
    client.write(`data: ${JSON.stringify(body)}\n\n`);
  });

  res.status(200).json({ ok: true });
}
