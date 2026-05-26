import { GetServerSideProps } from "next";
import { createClient } from "@supabase/supabase-js";

export default function AdminDashboard() {
  return <h1>管理者ダッシュボード</h1>;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  console.log("▶ SSR: Cookie:", ctx.req.cookies);

  const accessToken = ctx.req.cookies["sb-access-token"];

  if (!accessToken) {
    console.log("▶ SSR: accessToken が無い → ログインページへ");
    return {
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  // ★ Supabase Auth API を直接叩く（v2 の正しい方法）
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
  console.log("▶ SSR: user:", user);

  if (!user || user.error) {
    console.log("▶ SSR: user が null → ログインページへ");
    return {
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  // ★ profiles テーブルで管理者チェック
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  console.log("▶ SSR: profile:", profile);

  if (!profile?.is_admin) {
    console.log("▶ SSR: is_admin が false → トップへ");
    return {
      redirect: { destination: "/", permanent: false },
    };
  }

  return { props: {} };
};
