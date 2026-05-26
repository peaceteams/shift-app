import { GetServerSideProps } from "next";
import { requireAdmin } from "@/lib/auth/adminAuth";

type AdminProps = {
  user: {
    id: string;
    email: string;
  };
};

export default function AdminDashboard({ user }: AdminProps) {
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

export const getServerSideProps = async (ctx: any) => {
  const auth = await requireAdmin(ctx);

  if (!auth.ok) return auth.redirect;

  return {
    props: {
      user: auth.user,
    },
  };
};
