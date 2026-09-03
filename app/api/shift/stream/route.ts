import { NextRequest } from "next/server";

export const clients: {
  userId: string;
  controller: ReadableStreamDefaultController;
}[] = [];

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("sb-user-id")?.value;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      clients.push({ userId, controller });
    },
    cancel() {
      const idx = clients.findIndex((c) => c.userId === userId);
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
