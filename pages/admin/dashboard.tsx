import { useState, useEffect, useMemo } from "react";
import { requireAdmin } from "@/lib/auth/page/adminAuth";
import { supabaseApi } from "@/lib/supabase/api";
import { useRouter } from "next/router";
import { log } from "@/utils/logger";

type Member = {
  id: string;
  user_id: string;
  name: string;
};

export default function AdminDashboard({ user, initialMembers, initialLinks }: any) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [search, setSearch] = useState("")
  const router = useRouter();;

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter((m) => {
      return (
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q)
      );
    });
  }, [search, members]);

  //追加モーダル
  const [adding, setAdding] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addName, setAddName] = useState("");
  
  //編集モーダル
  const [editing, setEditing] = useState<Member | null>(null);
  const [editUserId, setEditUserId] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editName, setEditName] = useState("");

  async function refreshDashboard() {
    log("🔄 ダッシュボード最新データ取得");

    const res = await fetch("/api/dashboard/get");
    const json = await res.json();

    setMembers(json.members);
  }

  async function notifyShiftUpdated() {
  }
  
  // ---------------------------------------------------------
  // 👤メンバー追加
  // ---------------------------------------------------------
  function openAddModal() {
    setAdding(true);
    setAddName("");
  }

  function closeAddModal() {
    setAdding(false);
    setAddName("");
  }

  async function addMember() {
    const res = await fetch("/api/members/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addName,
        userId: addUserId,
        password: addPassword,
      }),
    });

    let json: any = null;

    try {
      json = await res.json();
    } catch {
      // JSON parse error
    }

    if (!res.ok) {
      alert("メンバー追加に失敗しました");
      return;
    }

    await notifyShiftUpdated();

    // 成功処理
    setAddUserId("");
    setAddPassword("");
    setAddName("");
  }
  
  // ---------------------------------------------------------
  // 👤 メンバー削除
  // ---------------------------------------------------------
  async function deleteMember(id: string) {
    if (!confirm("本当に削除しますか？")) return;

    const res = await fetch("/api/members/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      alert("削除に失敗しました");
      return;
    }

    await notifyShiftUpdated()
  }

  // ---------------------------------------------------------
  // 👤 メンバー編集
  // ---------------------------------------------------------
  function openEditModal(member: Member) {
    setEditing(member);
    setEditName(member.name);
    setEditUserId(member.user_id);
    setEditPassword("");
  }

  async function saveEdit() {
    if (!editing) return;

    await fetch("/api/members/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        id: editing.id,
        user_id: editUserId,
        password: editPassword || null,
      }),
    });

    await notifyShiftUpdated();

    setEditing(null);
  }

  // ---------------------------------------------------------
  // 🖥️ UI
  // ---------------------------------------------------------
  return (
    <div style={{ padding: 20 }}>
      <h1>管理者ダッシュボード</h1>

      <section style={{ marginTop: 40 }}>
        <h2>ページ移動</h2>

        <button onClick={() => router.push("./all-shift")}>全メンバーのシフト一覧</button>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>操作一覧</h2>

        <button onClick={openAddModal} style={{ marginLeft: 10 }}>
          メンバー追加
        </button>
      </section>

      <h2>検索</h2>
      <input
        placeholder="UID / 名前 で検索"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "300px", marginBottom: "20px" }}
      />

      <section style={{ marginTop: 40 }}>
        <h2>メンバー</h2>

        <ul>
          {filteredMembers.map((m) => (
            <li key={m.id} style={{ marginBottom: 15 }}>
              <strong>{m.name}</strong>
              <div>UUID: {m.id}</div>
              <div>ユーザーID: {m.user_id}</div>
              <div style={{ marginTop: 5 }}>
                <button onClick={() => openEditModal(m)}>編集</button>
                <button onClick={() => deleteMember(m.id)} style={{ marginLeft: 10, color: "red" }}>削除</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* メンバー追加モーダル */}
      {adding && (
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
            <h3>メンバー追加</h3>

            <input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="名前"
              style={{ width: "100%", marginBottom: 10 }}
            />

            <input
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value)}
              placeholder="ユーザーID（番号）"
              style={{ width: "100%", marginBottom: 10 }}
            />

            <input
              value={addPassword}
              onChange={(e) => setAddPassword(e.target.value)}
              placeholder="パスワード"
              style={{ width: "100%", marginBottom: 10 }}
            />
            <button onClick={addMember}>追加</button>
            <button onClick={closeAddModal} style={{ marginLeft: 10 }}>キャンセル</button>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
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
              value={editUserId}
              onChange={(e) => setEditUserId(e.target.value)}
              placeholder="ユーザーID（番号）"
              style={{ width: "100%", marginBottom: 10 }}
            />

            <input
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="パスワード"
              style={{ width: "100%", marginBottom: 10 }}
            />
            <button onClick={saveEdit}>保存</button>
            <button onClick={() => setEditing(null)} style={{ marginLeft: 10 }}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// 🔐 SSR: メンバー一覧 + シフト提出状況 + ワンタイムリンク
// ---------------------------------------------------------
export const getServerSideProps = async (ctx: any) => {
  log("--------------------------------------------------");
  log("[SSR] getServerSideProps START:", __filename);

  // ① SSR が読み込んでいるモジュール一覧
  log(
    "[SSR] loaded modules:",
    Object.keys(require.cache).filter((m) =>
      m.includes("api/shift") || m.includes("stream") || m.includes("notify")
    )
  );

  // ② URL と Cookie のログ
  log("[SSR] URL:", ctx.req.url);
  log("[SSR] cookies:", ctx.req.cookies);

  // ③ requireAdmin の開始・終了ログ
  log("[SSR] requireAdmin START");
  const auth = await requireAdmin(ctx);
  log("[SSR] requireAdmin END:", auth);

  // ④ 認証失敗時のログ
  if (!auth.ok) {
    log("[SSR] ❌ requireAdmin failed → redirect:", auth.redirect);
    return { redirect: auth.redirect };
  }

  log("[SSR] requireAdmin OK → fetching profiles");

  // ⑤ profiles 取得の開始・終了ログ
  log("[SSR] supabase profiles START");
  const { data: profiles, error: profilesError } = await supabaseApi
    .from("profiles")
    .select("id, name, user_id, password_hash")
    .order("created_at");
  log("[SSR] supabase profiles END:", { profilesError, profilesLength: profiles?.length });

  const members = (profiles ?? []).map((m: any) => ({
    id: m.id,
    user_id: m.user_id,
    name: m.name,
  }));

  log("[SSR] getServerSideProps END");
  log("--------------------------------------------------");

  return {
    props: {
      user: auth.user,
      initialMembers: members,
    },
  };
};
