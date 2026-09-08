import { GetServerSidePropsContext } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { log } from "@/utils/logger";

export async function requireAdmin(ctx: GetServerSidePropsContext) {
  log("▶ SSR 認証開始");

  const cookies = ctx.req.cookies;
  log("▶ SSR Cookie:", cookies);

  const token = cookies["admin_session"];
  log("▶ SSR admin_session:", token);

  if (!token) {
    log("❌ admin_session が SSR に届いていない → redirect");
    return {
      ok: false,
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  log("▶ admin_sessions START");
  const { data: session, error: sessionError } = await supabaseApi
    .from("admin_sessions")
    .select("admin_id")
    .eq("token", token)
    .maybeSingle();
  log("▶ admin_sessions END:", { session, sessionError });

  if (sessionError) {
    log("❌ admin_sessions error:", sessionError);
    return {
      ok: false,
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  if (!session) {
    log("❌ admin_sessions に該当セッションなし → redirect");
    return {
      ok: false,
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  log("▶ admins START");
  const { data: admin, error: adminError } = await supabaseApi
    .from("admins")
    .select("id")
    .eq("id", session.admin_id)
    .maybeSingle();
  log("▶ admins END:", { admin, adminError });

  if (adminError) {
    log("❌ admins error:", adminError);
    return {
      ok: false,
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  if (!admin) {
    log("❌ admins に該当管理者なし → redirect");
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
