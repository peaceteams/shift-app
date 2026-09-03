import { NextRequest } from "next/server";

type Client = {
  sessionToken: string;
  controller: ReadableStreamDefaultController;
};

export const clients: Client[] = [];

export async function GET(req: NextRequest) {
  // Cookie から sessionToken を取得
  const sessionToken = req.cookies.get("user_session")?.value;
  if (!sessionToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  // SSE ストリーム作成
  const stream = new ReadableStream({
    start(controller) {
      // 接続を保存
      clients.push({ sessionToken, controller });

      // 初回メッセージ（任意）
      controller.enqueue(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
    },

    cancel() {
      // 接続解除
      const idx = clients.findIndex((c) => c.sessionToken === sessionToken);
      if (idx !== -1) clients.splice(idx, 1);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
