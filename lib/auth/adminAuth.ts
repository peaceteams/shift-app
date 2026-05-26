// lib/adminAuth.ts
import { GetServerSidePropsContext } from "next";

export async function requireAdmin(ctx: GetServerSidePropsContext) {
  const accessToken = ctx.req.cookies["sb-access-token"];

  if (!accessToken) {
    return {
      ok: false,
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  const userRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
    }
  );

  const user = await userRes.json();

  if (!user || user.error) {
    return {
      ok: false,
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  const profileRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=is_admin`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const profile = await profileRes.json();

  if (!profile?.[0]?.is_admin) {
    return {
      ok: false,
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  return {
    ok: true,
    user,
  };
}
