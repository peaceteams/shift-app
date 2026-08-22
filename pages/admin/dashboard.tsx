import { useState, useEffect, useMemo } from "react";
import { requireAdmin } from "@/lib/auth/page/adminAuth";
import { supabaseClient } from "@/lib/supabase/client";
import { supabaseApi } from "@/lib/supabase/api";
import { useRouter } from "next/router";

type Member = {
  id: string;
  user_id: string;
  name: string;
  discord_id: string | null;
};

export default function AdminDashboard({ user, initialMembers, initialLinks }: any) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [linkMap, setLinkMap] = useState<Record<string, string>>(initialLinks);

  const [search, setSearch] = useState("")
  
  const router = useRouter();;

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

  //追加モーダル
  const [adding, setAdding] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addName, setAddName] = useState("");
  const [addDiscord, setAddDiscord] = useState("");
  
  //編集モーダル
  const [editing, setEditing] = useState<Member | null>(null);
  const [editUserId, setEditUserId] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editName, setEditName] = useState("");
  const [editDiscord, setEditDiscord] = useState("");

  //コピー吹き出し
  const [bubbleMap, setBubbleMap] = useState<{ [id: string]: "show" | "hide" | null }>({});

  // ---------------------------------------------------------
  // 🔌 Realtime: メンバー & ワンタイムリンク
  // ---------------------------------------------------------
  useEffect(() => {
    // Strict Mode 対策：初回だけ実行
    if ((window as any).__realtimeSubscribed) return;
    (window as any).__realtimeSubscribed = true;

    // console.log("🔌 Realtime 初期化開始");

    // -----------------------------
    // profiles
    // -----------------------------
    const profilesChannel = supabaseClient
      .channel("profiles-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload: any) => {
          console.log("📡 [profiles] Realtime 受信:", payload);

          const newRow = payload.new as Member | null;
          const oldRow = payload.old as Member | null;

          setMembers((prev) => {
            console.log("📘 [profiles] 更新前 members:", prev);

            switch (payload.eventType) {
              case "INSERT":
                console.log("➕ INSERT:", newRow);
                return newRow ? [...prev, newRow] : prev;

              case "UPDATE":
                console.log("♻ UPDATE:", newRow);
                return newRow
                  ? prev.map((m) => (m.id === newRow.id ? newRow : m))
                  : prev;

              case "DELETE":
                console.log("🗑 DELETE:", oldRow);
                return oldRow
                  ? prev.filter((m) => m.id !== oldRow.id)
                  : prev;

              default:
                console.log("❓ 未知イベント:", payload.eventType);
                return prev;
            }
          });
        }
      )
      .subscribe((status) => {
        // console.log("🔌 profiles-realtime subscribe 状態:", status);
      });

    // -----------------------------
    // shift_links
    // -----------------------------
    const linksChannel = supabaseClient
      .channel("shift-links-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shift_links" },
        (payload: any) => {
          // console.log("📡 [shift_links] Realtime 受信:", payload);

          const newRow = payload.new as { user_id: string; token: string } | null;

          setLinkMap((prev) => {
            // console.log("📘 [shift_links] 更新前 linkMap:", prev);

            switch (payload.eventType) {
              case "INSERT":
                // console.log("📘 [shift_links] 作成 linkMap:", prev);
              case "UPDATE":
                // console.log("♻ INSERT/UPDATE:", newRow);
                if (!newRow) return prev;
                // console.log("📘 [shift_links] 更新後 linkMap:", prev);
                return {
                  ...prev,
                  [newRow.user_id]: `${process.env.NEXT_PUBLIC_APP_URL}/shift/${newRow.token}`,
                };

              case "DELETE":
                setLinkMap((prev) => {
                  const oldToken = payload.old?.token;

                  // token が無ければ prev を返す（undefined は返さない）
                  if (!oldToken) {
                    return prev;
                  }

                  // token → user_id の逆引き
                  const userId = Object.keys(prev).find((uid) =>
                    prev[uid]?.includes(oldToken)
                  );

                  // userId が見つからなければ prev を返す
                  if (!userId) {
                    return prev;
                  }

                  // ここまで来たら確実に更新
                  const updated = { ...prev };
                  delete updated[userId];
                  return updated;
                });
              
              default:
                // console.log("❓ 未知イベント:", payload.eventType);
                return prev;
            }
          });
        }
      )
      .subscribe((status) => {
        // console.log("🔌 shift-links-realtime subscribe 状態:", status);
      });

    return () => {
      // console.log("🔌 Realtime チャンネル解除");
      supabaseClient.removeChannel(profilesChannel);
      supabaseClient.removeChannel(linksChannel);
    };
  }, []);
  
  // ---------------------------------------------------------
  // 👤メンバー追加
  // ---------------------------------------------------------
  function openAddModal() {
    setAdding(true);
    setAddName("");
    setAddDiscord("");
  }

  function closeAddModal() {
    setAdding(false);
    setAddName("");
    setAddDiscord("");
  }

  async function addMember() {
    const res = await fetch("/api/members/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addName,
        discord_id: addDiscord,
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

    // 成功処理
    setAddUserId("");
    setAddPassword("");
    setAddName("");
    setAddDiscord("");
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
  }

  // ---------------------------------------------------------
  // 👤 メンバー編集
  // ---------------------------------------------------------
  function openEditModal(member: Member) {
    setEditing(member);
    setEditName(member.name);
    setEditDiscord(member.discord_id ?? "");
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
        discord_id: editDiscord,
      }),
    });

    setEditing(null);
  }

  // ---------------------------------------------------------
  // 🔗 ワンタイムリンク管理
  // ---------------------------------------------------------
  async function generateLink(user_id: string) {
    await fetch("/api/onetime/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id }),
    });
  }

  async function deleteLink(user_id: string) {
    await fetch("/api/onetime/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id }),
    });
  }

  async function sendLink(user_id: string) {
    await fetch("/api/onetime/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id }),
    });
  }

  // ---------------------------------------------------------
  // 🧩 一括操作
  // ---------------------------------------------------------
  async function generateAll() {
    await fetch("/api/onetime/regenerate-all", { method: "POST" });
  }

  async function deleteAll() {
    await fetch("/api/onetime/delete-all", { method: "POST" });
  }

  async function sendAll() {
    await fetch("/api/onetime/send-all", { method: "POST" });
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

        <button onClick={generateAll} style={{ marginRight: 10 }}>
          全員生成 / 再生成
        </button>

        <button onClick={deleteAll} style={{ marginRight: 10 }}>
          全員削除
        </button>

        <button onClick={sendAll}>全員にDM送信</button>

        <button onClick={openAddModal} style={{ marginLeft: 10 }}>
          メンバー追加
        </button>
      </section>

      <h2>検索</h2>
      <input
        placeholder="UID / 名前 / Discord ID で検索"
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
              <div>Discord: {m.discord_id ?? "未登録"}</div>

            {linkMap[m.id] ? (
              <div className="url-wrapper">
                <span>URL: </span>
                <span
                  className="url-text"
                  onClick={() => {
                    navigator.clipboard.writeText(linkMap[m.id]);

                    setBubbleMap((prev) => ({ ...prev, [m.id]: "show" }));

                    setTimeout(() => {
                      setBubbleMap((prev) => ({ ...prev, [m.id]: "hide" }));
                    }, 1200);

                    setTimeout(() => {
                      setBubbleMap((prev) => ({ ...prev, [m.id]: null }));
                    }, 1500);
                  }}
                >
                  {linkMap[m.id]}
                </span>

                {bubbleMap[m.id] && (
                  <span className={`copy-bubble ${bubbleMap[m.id]}`}>
                    Copied!
                  </span>
                )}
              </div>
            ) : (
              <div className="url-wrapper">URL: 未生成</div>
            )}

              <div style={{ marginTop: 5 }}>
                <button onClick={() => openEditModal(m)}>編集</button>

                <button onClick={() => deleteLink(m.id)} style={{ marginLeft: 10 }}>
                  ワンタイムリンク削除
                </button>

                <button onClick={() => generateLink(m.id)} style={{ marginLeft: 10 }}>
                  ワンタイムリンク生成 / 再生成
                </button>

                <button onClick={() => sendLink(m.id)} style={{ marginLeft: 10 }}>
                  DMにワンタイムリンクを送信
                </button>

                <button onClick={() => deleteMember(m.id)} style={{ marginLeft: 10, color: "red" }}>
                  削除
                </button>
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

            <input
              value={addDiscord}
              onChange={(e) => setAddDiscord(e.target.value)}
              placeholder="Discord ID（任意）"
              style={{ width: "100%", marginBottom: 10 }}
            />

            <button onClick={addMember}>追加</button>
            <button onClick={closeAddModal} style={{ marginLeft: 10 }}>
              キャンセル
            </button>
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

            <input
              value={editDiscord}
              onChange={(e) => setEditDiscord(e.target.value)}
              placeholder="Discord ID"
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
  const auth = await requireAdmin(ctx);
  if (!auth.ok) return { redirect: auth.redirect };



  // ① profiles
  const { data: profiles } = await supabaseApi
    .from("profiles")
    .select("id, name, user_id, password_hash, discord_id")
    .order("created_at");

  const members = (profiles ?? []).map((m: any) => ({
    id: m.id,
    user_id: m.user_id,
    name: m.name,
    discord_id: m.discord_id
  }));

  // ③ shift_links（重要）
  const { data: links } = await supabaseApi
    .from("shift_links")
    .select("user_id, token");

  const linkMap: Record<string, string> = {};
  for (const row of links ?? []) {
    linkMap[row.user_id] = `${process.env.NEXT_PUBLIC_APP_URL}/shift/${row.token}`;
  }

  return {
    props: {
      user: auth.user,
      initialMembers: members,
      initialLinks: linkMap,
    },
  };
};
