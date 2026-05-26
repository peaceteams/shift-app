import { GetServerSideProps } from "next";
import { createClient } from "@supabase/supabase-js";

export default function AdminDashboard({ user }) {
  return (
    <div style={{ padding: "20px" }}>
      <h1>管理者ダッシュボード</h1>
      <p>ログイン中: {user.email}</p>

      <div style={{ marginTop: "30px" }}>
        <h2>シフト送信リンク管理</h2>

        <button style={{ marginRight: "10px" }}>
          全員に DM を送信
        </button>

        <button style={{ marginRight: "10px" }}>
          個別に DM を送信
        </button>

        <button style={{ marginRight: "10px" }}>
          ワンタイムリンクを生成
        </button>

        <button style={{ marginRight: "10px" }}>
          ワンタイムリンクを再生成
        </button>

        <button>
          ワンタイムリンクを無効化
        </button>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const accessToken = ctx.req.cookies["sb-access-token"];

  if (!accessToken) {
    return {
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  // ★ Supabase Auth API でユーザー取得
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

  return {
    props: { user },
  };
};
