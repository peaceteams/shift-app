// lib/adminAuth.ts
import { GetServerSidePropsContext } from "next";

export async function requireAdmin(ctx: GetServerSidePropsContext) {
  console.log("▶ SSR 認証開始");

  const cookies = ctx.req.cookies;
  console.log("▶ SSR Cookie:", cookies);

  const accessToken = cookies["sb-access-token"];
  console.log("▶ SSR accessToken:", accessToken);

  if (!accessToken) {
    console.log("❌ accessToken が SSR に届いていない");
    return {
      ok: false,
      reason: "NO_ACCESS_TOKEN",
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  // --- Supabase Auth API でユーザー取得 ---
  console.log("▶ Supabase Auth API に問い合わせ中…");

  const userRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
    }
  );

  console.log("▶ userRes.status:", userRes.status);

  const user = await userRes.json();
  console.log("▶ userRes.json:", user);

  if (!user || user.error) {
    console.log("❌ Supabase Auth API が user を返さなかった");
    return {
      ok: false,
      reason: "INVALID_USER",
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  // --- 管理者チェック ---
  console.log("▶ 管理者チェック開始 user.id:", user.id);

  const profileRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=is_admin`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  console.log("▶ profileRes.status:", profileRes.status);

  const profile = await profileRes.json();
  console.log("▶ profileRes.json:", profile);

  if (!profile?.[0]?.is_admin) {
    console.log("❌ is_admin が false または取得できない");
    return {
      ok: false,
      reason: "NOT_ADMIN",
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  console.log("✅ SSR 認証成功 user:", user.email);

  return {
    ok: true,
    user,
  };
}
