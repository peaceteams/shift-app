import type { NextApiRequest, NextApiResponse } from "next";

// 🔥 ここで export する（notify.ts から使う）
export const clients: NextApiResponse[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // SSE ヘッダー
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // 接続を保存
  clients.push(res);

  // 接続開始時にメッセージ送信（任意）
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  // 接続が切れたら削除
  req.on("close", () => {
    const index = clients.indexOf(res);
    if (index !== -1) clients.splice(index, 1);
  });
}
