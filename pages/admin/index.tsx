import { GetServerSideProps } from "next";
import { createClient } from "@supabase/supabase-js";

export default function AdminDashboard() {
  return <h1>管理者ダッシュボード</h1>;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${ctx.req.cookies["sb-access-token"]}`,
        },
      },
    }
  );

  // ユーザー取得
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  // 管理者チェック
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
