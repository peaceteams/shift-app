import { GetServerSidePropsContext } from "next";
import { supabaseApi } from "@/lib/supabase/api";

export async function requireAdmin(ctx: GetServerSidePropsContext) {
  log("▶ SSR 認証開始");

  const cookies = ctx.req.cookies;
  log("▶ SSR Cookie:", cookies);

  const token = cookies["admin_session"];
  log("▶ SSR admin_session:", token);

  if (!token) {
    log("❌ admin_session が SSR に届いていない");
    return {
      ok: false,
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  // セッション確認
  const { data: session } = await supabaseApi
    .from("admin_sessions")
    .select("admin_id")
    .eq("token", token)
    .maybeSingle();

  log("▶ session:", session);

  if (!session) {
    log("❌ admin_sessions に該当セッションなし");
    return {
      ok: false,
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  // 管理者情報取得
  const { data: admin } = await supabaseApi
    .from("admins")
    .select("id")
    .eq("id", session.admin_id)
    .maybeSingle();

  if (!admin) {
    log("❌ admins に該当管理者なし");
    return {
      ok: false,
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  log("✅ SSR 認証成功");

  return {
    ok: true,
    user: admin,
  };
}
