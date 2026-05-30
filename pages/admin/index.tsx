import { useState, useEffect, useMemo } from "react";
import { requireAdmin } from "@/lib/auth/adminAuth";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type Member = {
  id: string;
  name: string;
  discord_id: string | null;
  submitted?: boolean;
};

export default function AdminDashboard({ user, initialMembers, initialLinks }: any) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [linkMap, setLinkMap] = useState<Record<string, string>>(initialLinks);

  const [search, setSearch] = useState("");

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDiscord, setNewDiscord] = useState("");

  //編集モーダル
  const [editing, setEditing] = useState<Member | null>(null);
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
    const profilesChannel = supabase
      .channel("profiles-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload: any) => {
          // console.log("📡 [profiles] Realtime 受信:", payload);

          const newRow = payload.new as Member | null;
          const oldRow = payload.old as Member | null;

          setMembers((prev) => {
            // console.log("📘 [profiles] 更新前 members:", prev);

            switch (payload.eventType) {
              case "INSERT":
                // console.log("➕ INSERT:", newRow);
                return newRow ? [...prev, newRow] : prev;

              case "UPDATE":
                // console.log("♻ UPDATE:", newRow);
                return newRow
                  ? prev.map((m) => (m.id === newRow.id ? newRow : m))
                  : prev;

              case "DELETE":
                // console.log("🗑 DELETE:", oldRow);
                return oldRow
                  ? prev.filter((m) => m.id !== oldRow.id)
                  : prev;

              default:
                // console.log("❓ 未知イベント:", payload.eventType);
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
    const linksChannel = supabase
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
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(linksChannel);
    };
  }, []);
  
  // ---------------------------------------------------------
  // 👤メンバー追加
  // ---------------------------------------------------------
    function openAddModal() {
      setShowAddModal(true);
    }

    async function addMember() {
      const res = await fetch("/api/members/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, discord_id: newDiscord }),
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        // console.error("JSON parse error");
      }

      if (!res.ok) {
        // console.error("メンバー追加エラー:", json?.error ?? res.statusText);
        alert("メンバー追加に失敗しました");
        return;
      }

      // Realtime が更新してくれるので setMembers は不要
      setNewName("");
      setNewDiscord("");
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
  // 🔗 ワンタイムリンク管理
  // ---------------------------------------------------------
  async function generateLink(user_id: string) {
    await fetch("/api/shift/regenerate", {
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
    await fetch("/api/shift/regenerate-all", { method: "POST" });
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

      <section style={{ marginTop: 40 }}>
        <h2>ワンタイムリンク一括操作</h2>

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

        {showAddModal && (
          <div className="modal">
            <h3>メンバー追加</h3>

            <input
              type="text"
              placeholder="名前"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />

            <input
              type="text"
              placeholder="Discord ID（任意）"
              value={newDiscord}
              onChange={(e) => setNewDiscord(e.target.value)}
            />

            <button onClick={addMember}>追加</button>
            <button onClick={() => setShowAddModal(false)}>閉じる</button>
          </div>
        )}
      </section>

      <h2>検索</h2>
      <input
        placeholder="UID / 名前 / Discord ID で検索"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "300px", marginBottom: "20px" }}
      />

      <section style={{ marginTop: 40 }}>
        <h2>メンバー一覧（Realtime + 提出状況）</h2>

        <ul>
          {filteredMembers.map((m) => (
            <li key={m.id} style={{ marginBottom: 15 }}>
              <strong>{m.name}</strong>
              <div>Discord: {m.discord_id ?? "未登録"}</div>
              <div>UID: {m.id}</div>

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

              <div>{m.submitted ? "シフト提出 ☑" : "シフト提出 ☐"}</div>

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
            <button onClick={() => setEditing(null)} style={{ marginLeft: 10 }}>
              キャンセル
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

  const supabaseServer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ① profiles
  const { data: profiles } = await supabaseServer
    .from("profiles")
    .select("id, name, discord_id")
    .order("created_at");

  // ② shift_requests
  const { data: requests } = await supabaseServer
    .from("shift_requests")
    .select("user_id");

  const submittedSet = new Set<string>(
    (requests ?? []).map((r: any) => r.user_id)
  );

  const members = (profiles ?? []).map((m: any) => ({
    id: m.id,
    name: m.name,
    discord_id: m.discord_id,
    submitted: submittedSet.has(m.id),
  }));

  // ③ shift_links（重要）
  const { data: links } = await supabaseServer
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
