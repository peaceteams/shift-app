import { GetServerSideProps } from "next";
import { createClient } from "@supabase/supabase-js";

export default function AdminDashboard() {
  return <h1>管理者ダッシュボード</h1>;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  console.log("▶ SSR: Cookie:", ctx.req.cookies);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: {
        headers: {
          Authorization: `Bearer ${ctx.req.cookies["sb-access-token"]}`,
        },
      },
    }
  );

  const { data: userData } = await supabase.auth.getUser();
  console.log("▶ SSR: getUser:", userData);

  if (!userData.user) {
    console.log("▶ SSR: user が null → ログインページへ");
    return {
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  return { props: {} };
};
