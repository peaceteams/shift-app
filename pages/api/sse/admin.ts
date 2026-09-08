// /pages/sse/admin.ts
import type { NextApiRequest, NextApiResponse } from "next";
import {
  initSSE,
  addAdminConnection,
  removeConnection,
} from "@/lib/sse/server";

export const config = {
  runtime: "nodejs", // Next.js 16 で SSE を安定させる
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // SSE 初期化
  initSSE(res);

  // 管理者接続を登録
  addAdminConnection(res);

  // 接続終了時のクリーンアップ
  req.on("close", () => {
    removeConnection(res);
  });
}
