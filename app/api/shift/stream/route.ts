import { NextRequest } from "next/server";
import { supabaseClient } from "@/lib/supabase/client";

export const clients: {
  userId: string;
  controller: ReadableStreamDefaultController;
}[] = [];

export async function GET(req: NextRequest) {
  const sessionToken = req.cookies.get("user_session")?.value;
  if (!sessionToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data, error } = await supabaseClient
    .from("user_sessions")
    .select("user_id")
    .eq("token", sessionToken)
    .single();

  if (!data) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = data.user_id;

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
