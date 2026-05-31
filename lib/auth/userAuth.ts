// /lib/auth/userAuth.ts
import { createClient } from "@supabase/supabase-js";
import { parse } from "cookie";

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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // セッション検索
  const { data: session } = await supabaseAdmin
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
  const { data: user } = await supabaseAdmin
    .from("profiles")
    .select("id, user_id, name, discord_id")
    .eq("id", session.user_id)
    .single();

  return {
    ok: true,
    user,
  };
}
