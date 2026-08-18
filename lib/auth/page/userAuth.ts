// /lib/auth/userAuth.ts
import { parse } from "cookie";
import { supabaseApi } from "@/lib/supabase/api";

export async function requireUser(ctx: any) {
  const cookies = parse(ctx.req.headers.cookie || "");
  const token = cookies["user_session"];

  if (!token) {
    return {
      ok: false,
      redirect: {
        destination: "/user/login",
        permanent: false,
      },
    };
  }

  // セッション検索
  const { data: session } = await supabaseApi
    .from("user_sessions")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();

  if (!session) {
    return {
      ok: false,
      redirect: {
        destination: "/user/login",
        permanent: false,
      },
    };
  }

  // プロフィール取得
  const { data: user } = await supabaseApi
    .from("profiles")
    .select("id, user_id, name, discord_id")
    .eq("id", session.user_id)
    .single();

  return {
    ok: true,
    user,
  };
}
