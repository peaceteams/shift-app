import { GetServerSidePropsContext } from "next";
import { createClient } from "@supabase/supabase-js";

export async function requireAdmin(ctx: GetServerSidePropsContext) {
  console.log("▶ SSR 認証開始");

  const cookies = ctx.req.cookies;
  console.log("▶ SSR Cookie:", cookies);

  const token = cookies["admin_session"];
  console.log("▶ SSR admin_session:", token);

  if (!token) {
    console.log("❌ admin_session が SSR に届いていない");
    return {
      ok: false,
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // セッション確認
  const { data: session } = await supabaseAdmin
    .from("admin_sessions")
    .select("admin_id")
    .eq("token", token)
    .maybeSingle();

  console.log("▶ session:", session);

  if (!session) {
    console.log("❌ admin_sessions に該当セッションなし");
    return {
      ok: false,
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  // 管理者情報取得
  const { data: admin } = await supabaseAdmin
    .from("admins")
    .select("id")
    .eq("id", session.admin_id)
    .maybeSingle();

  if (!admin) {
    console.log("❌ admins に該当管理者なし");
    return {
      ok: false,
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  console.log("✅ SSR 認証成功");

  return {
    ok: true,
    user: admin,
  };
}
