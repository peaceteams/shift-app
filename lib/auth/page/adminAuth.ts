import { GetServerSidePropsContext } from "next";
import { supabaseApi } from "@/lib/supabase/api";

export async function requireAdmin(ctx: GetServerSidePropsContext) {
  console.log("▶ SSR 認証開始");

  const cookies = ctx.req.cookies;
  console.log("▶ SSR Cookie:", cookies);

  const token = cookies["admin_session"];
  console.log("▶ SSR admin_session:", token);

  if (!token) {
    console.log("❌ admin_session が SSR に届いていない → redirect");
    return {
      ok: false,
      redirect: { destination: "/admin/console.login", permanent: false },
    };
  }

  console.log("▶ admin_sessions START");
  const { data: session, error: sessionError } = await supabaseApi
    .from("admin_sessions")
    .select("admin_id")
    .eq("token", token)
    .maybeSingle();
  console.log("▶ admin_sessions END:", { session, sessionError });

  if (sessionError) {
    console.log("❌ admin_sessions error:", sessionError);
    return {
      ok: false,
      redirect: { destination: "/admin/console.login", permanent: false },
    };
  }

  if (!session) {
    console.log("❌ admin_sessions に該当セッションなし → redirect");
    return {
      ok: false,
      redirect: { destination: "/admin/console.login", permanent: false },
    };
  }

  console.log("▶ admins START");
  const { data: admin, error: adminError } = await supabaseApi
    .from("admins")
    .select("id")
    .eq("id", session.admin_id)
    .maybeSingle();
  console.log("▶ admins END:", { admin, adminError });

  if (adminError) {
    console.log("❌ admins error:", adminError);
    return {
      ok: false,
      redirect: { destination: "/admin/console.login", permanent: false },
    };
  }

  if (!admin) {
    console.log("❌ admins に該当管理者なし → redirect");
    return {
      ok: false,
      redirect: { destination: "/admin/console.login", permanent: false },
    };
  }

  console.log("✅ SSR 認証成功");
  return {
    ok: true,
    user: admin,
  };
}
