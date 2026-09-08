// /lib/sse/server.ts
import { ServerResponse } from "http";

// ユーザーごとの SSE 接続
const userConnections: Record<string, ServerResponse[]> = {};

// 管理者の SSE 接続
const adminConnections: ServerResponse[] = [];

// SSE 接続を初期化する共通関数
export function initSSE(res: ServerResponse) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  res.write("retry: 3000\n\n");
}

// ユーザーの SSE 接続を登録
export function addUserConnection(userId: string, res: ServerResponse) {
  if (!userConnections[userId]) {
    userConnections[userId] = [];
  }
  userConnections[userId].push(res);

  console.log("[SSE] User connected:", userId);
}

// 管理者の SSE 接続を登録
export function addAdminConnection(res: ServerResponse) {
  adminConnections.push(res);
  console.log("[SSE] Admin connected");
}

// ユーザーへ通知を送る
export function sendToUser(userId: string, payload: any) {
  const conns = userConnections[userId];
  if (!conns) return;

  const data = `data: ${JSON.stringify(payload)}\n\n`;

  conns.forEach((res) => res.write(data));
  console.log("[SSE] Sent to user:", userId, payload);
}

// 管理者へ通知を送る
export function sendToAdmin(payload: any) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;

  adminConnections.forEach((res) => res.write(data));
  console.log("[SSE] Sent to admin:", payload);
}

// 接続終了時のクリーンアップ
export function removeConnection(res: ServerResponse) {
  // ユーザー接続から削除
  for (const userId in userConnections) {
    userConnections[userId] = userConnections[userId].filter((r) => r !== res);
  }

  // 管理者接続から削除
  const idx = adminConnections.indexOf(res);
  if (idx !== -1) adminConnections.splice(idx, 1);

  console.log("[SSE] Connection removed");
}
