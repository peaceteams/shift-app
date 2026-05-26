import { useState, useEffect, useMemo } from "react";
import { requireAdmin } from "@/lib/auth/adminAuth";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type Member = {
  id: string;
  name: string;
  discord_id: string | null;
};

type AdminProps = {
  user: {
    id: string;
    email: string;
  };
  initialMembers: Member[];
};

export default function AdminDashboard({ user, initialMembers }: AdminProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);

  // ---------------------------------------------------------
  // 🔌 Realtime: メンバー一覧をリアルタイム更新
  // ---------------------------------------------------------
  useEffect(() => {
    const channel = supabase
      .channel("profiles-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          const newRow = payload.new as Member | null;
          const oldRow = payload.old as Member | null;

          setMembers((prev) => {
            switch (payload.eventType) {
              case "INSERT":
                return [...prev, newRow!];
              case "UPDATE":
                return prev.map((m) => (m.id === newRow!.id ? newRow! : m));
              case "DELETE":
                return prev.filter((m) => m.id !== oldRow!.id);
              default:
                return prev;
            }
          });
        }
      )
      .subscribe();

    // ★ クリーンアップは同期関数で Promise を返さないようにする
    return () => {
      supabase.removeChannel(channel); // ← これでOK
    };
  }, []);

  // ---------------------------------------------------------
  // 👤 メンバー管理 API
  // ---------------------------------------------------------
  async function addMember(name: string, discord_id: string) {
    await fetch("/api/members/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, discord_id }),
    });
  }

  async function updateMember(id: string, name: string, discord_id: string) {
    await fetch("/api/members/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name, discord_id }),
    });
  }

  async function deleteMember(id: string) {
    await fetch("/api/members/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  // ---------------------------------------------------------
  // 🔗 ワンタイムリンク管理（個別）
  // ---------------------------------------------------------
  async function generateLink(user_id: string) {
    await fetch("/api/shift/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id }),
    });
  }

  async function deleteLink(user_id: string) {
    await fetch("/api/shift/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id }),
    });
  }

  async function sendLink(user_id: string) {
    await fetch("/api/shift/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id }),
    });
  }

  // ---------------------------------------------------------
  // 🧩 ワンタイムリンク管理（一括）
  // ---------------------------------------------------------
  async function generateAll() {
    await fetch("/api/shift/generate-all", { method: "POST" });
  }

  async function deleteAll() {
    await fetch("/api/shift/delete-all", { method: "POST" });
  }

  async function sendAll() {
    await fetch("/api/shift/send-all", { method: "POST" });
  }

  // ---------------------------------------------------------
  // 🖥️ UI（まだ土台だけ）
  // ---------------------------------------------------------
  return (
    <div style={{ padding: "20px" }}>
      <h1>管理者ダッシュボード</h1>
      <p>ログイン中: {user.email}</p>

      {/* ---------------- メンバー一覧 ---------------- */}
      <section style={{ marginTop: "40px" }}>
        <h2>メンバー一覧（Realtime）</h2>

        <ul>
          {members.map((m) => (
            <li key={m.id} style={{ marginBottom: "15px" }}>
              <strong>{m.name}</strong>（Discord: {m.discord_id ?? "未登録"}）<br />
              UID: {m.id}

              <div style={{ marginTop: "5px" }}>
                <button onClick={() => updateMember(m.id, m.name, m.discord_id ?? "")}>
                  編集
                </button>

                <button
                  onClick={() => deleteMember(m.id)}
                  style={{ marginLeft: "10px", color: "red" }}
                >
                  削除
                </button>

                {/* ワンタイムリンク管理 */}
                <button
                  onClick={() => generateLink(m.id)}
                  style={{ marginLeft: "10px" }}
                >
                  生成 / 再生成
                </button>

                <button
                  onClick={() => deleteLink(m.id)}
                  style={{ marginLeft: "10px" }}
                >
                  削除
                </button>

                <button
                  onClick={() => sendLink(m.id)}
                  style={{ marginLeft: "10px" }}
                >
                  DM送信
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------- 一括操作 ---------------- */}
      <section style={{ marginTop: "40px" }}>
        <h2>ワンタイムリンク一括操作</h2>

        <button onClick={generateAll} style={{ marginRight: "10px" }}>
          全員生成 / 再生成
        </button>

        <button onClick={deleteAll} style={{ marginRight: "10px" }}>
          全員削除
        </button>

        <button onClick={sendAll}>全員にDM送信</button>
      </section>
    </div>
  );
}

// ---------------------------------------------------------
// 🔐 SSR: 管理者チェック + メンバー一覧取得
// ---------------------------------------------------------
export const getServerSideProps = async (ctx: any) => {
  const auth = await requireAdmin(ctx);
  if (!auth.ok) return { redirect: auth.redirect };

  const supabaseServer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: members } = await supabaseServer
    .from("profiles")
    .select("*")
    .order("created_at");

  return {
    props: {
      user: auth.user,
      initialMembers: members ?? [],
    },
  };
};
