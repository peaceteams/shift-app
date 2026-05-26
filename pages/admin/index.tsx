import { GetServerSideProps } from "next";
import { createClient } from "@supabase/supabase-js";

export default function AdminDashboard() {
  return <h1>管理者ダッシュボード</h1>;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const accessToken = ctx.req.cookies["sb-access-token"];

  if (!accessToken) {
    return {
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  // ★ Supabase Auth API を直接叩く
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
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  // ★ profiles で管理者チェック
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return {
      redirect: { destination: "/", permanent: false },
    };
  }

  return { props: {} };
};
