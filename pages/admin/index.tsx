import { useState, useEffect, useMemo } from "react";
import { requireAdmin } from "@/lib/auth/adminAuth";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type Member = {
  id: string;
  name: string;
  discord_id: string | null;
  submitted?: boolean; // ← シフト提出状況
};

export default function AdminDashboard({ user, initialMembers }: any) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  // ★ 検索クエリ
  const [search, setSearch] = useState("");

  // ★ フィルタリング（検索）
  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase();

    return members.filter((m) => {
      return (
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.discord_id ?? "").toLowerCase().includes(q)
      );
    });
  }, [search, members]);
  // 編集モーダル用
  const [editing, setEditing] = useState<Member | null>(null);
  const [editName, setEditName] = useState("");
  const [editDiscord, setEditDiscord] = useState("");

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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ---------------------------------------------------------
  // 👤 メンバー編集（モーダル）
  // ---------------------------------------------------------
  function openEditModal(member: Member) {
    setEditing(member);
    setEditName(member.name);
    setEditDiscord(member.discord_id ?? "");
  }

  async function saveEdit() {
    if (!editing) return;

    await fetch("/api/members/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing.id,
        name: editName,
        discord_id: editDiscord,
      }),
    });

    setEditing(null);
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
  // 🧩 一括操作
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
  // 🖥️ UI
  // ---------------------------------------------------------
  return (
    <div style={{ padding: 20 }}>
      <h1>管理者ダッシュボード</h1>
      <p>ログイン中: {user.email}</p>

      {/* ---------------- 一括操作 ---------------- */}
      <section style={{ marginTop: 40 }}>
        <h2>ワンタイムリンク一括操作</h2>

        <button onClick={generateAll} style={{ marginRight: 10 }}>
          全員生成 / 再生成
        </button>

        <button onClick={deleteAll} style={{ marginRight: 10 }}>
          全員削除
        </button>

        <button onClick={sendAll}>全員にDM送信</button>
      </section>

      {/* ----------------- 検索 ------------------- */}
      <h2>検索</h2>
      <input
        placeholder="UID / 名前 / Discord ID で検索"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "300px", marginBottom: "20px" }}
      />

      {/* ---------------- メンバー一覧 ---------------- */}
      <section style={{ marginTop: 40 }}>
        <h2>メンバー一覧（Realtime + 提出状況）</h2>

        <ul>
          {filteredMembers.map((m) => (
            <li key={m.id} style={{ marginBottom: 15 }}>
              <strong>{m.name}</strong>
              <br />Discord: {m.discord_id ?? "未登録"}
              <br />UID: {m.id}

              {/* シフト提出状況 */}
              <br />
              <span>
                {m.submitted ? "シフト提出済み ☑" : "シフト未提出 ☐"}
              </span>

              <div style={{ marginTop: 5 }}>
                <button onClick={() => openEditModal(m)}>編集</button>

                <button
                  onClick={() => deleteLink(m.id)}
                  style={{ marginLeft: 10 }}
                >
                  ワンタイムリンク削除
                </button>

                <button
                  onClick={() => generateLink(m.id)}
                  style={{ marginLeft: 10 }}
                >
                  ワンタイムリンク生成 / 再生成
                </button>

                <button
                  onClick={() => sendLink(m.id)}
                  style={{ marginLeft: 10 }}
                >
                  DMにワンタイムリンクを送信
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------- 編集モーダル ---------------- */}
      {editing && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: 20,
              borderRadius: 8,
              width: 300,
            }}
          >
            <h3>編集</h3>

            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="名前"
              style={{ width: "100%", marginBottom: 10 }}
            />

            <input
              value={editDiscord}
              onChange={(e) => setEditDiscord(e.target.value)}
              placeholder="Discord ID"
              style={{ width: "100%", marginBottom: 10 }}
            />

            <button onClick={saveEdit}>保存</button>
            <button
              onClick={() => setEditing(null)}
              style={{ marginLeft: 10 }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// 🔐 SSR: メンバー一覧 + シフト提出状況を取得
// ---------------------------------------------------------
export const getServerSideProps = async (ctx: any) => {
  const auth = await requireAdmin(ctx);
  if (!auth.ok) return { redirect: auth.redirect };

  const supabaseServer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ① 全メンバー取得
  const { data: profiles, error: profilesError } = await supabaseServer
    .from("profiles")
    .select("id, name, discord_id")
    .order("created_at");

  if (profilesError) {
    console.error("profiles fetch error:", profilesError.message);
  }

  // ② shift_requests から「提出済みユーザーの user_id 一覧」を取得
  const { data: requests, error: requestsError } = await supabaseServer
    .from("shift_requests")
    .select("user_id");

  if (requestsError) {
    console.error("shift_requests fetch error:", requestsError.message);
  }

  // 提出済みユーザーの ID セット
  const submittedSet = new Set<string>(
    (requests ?? []).map((r: any) => r.user_id)
  );

  // ③ マージ：shift_requests に存在しないユーザーは未提出
  const members = (profiles ?? []).map((m: any) => ({
    id: m.id,
    name: m.name,
    discord_id: m.discord_id,
    submitted: submittedSet.has(m.id), // ← ここがポイント
  }));

  return {
    props: {
      user: auth.user,
      initialMembers: members,
    },
  };
};
