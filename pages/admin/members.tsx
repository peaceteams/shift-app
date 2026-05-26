import { useState, useEffect, useMemo } from "react";
import { requireAdmin } from "@/lib/auth/adminAuth";
import { supabase } from "@/lib/supabase/client";
import { createClient } from "@supabase/supabase-js";

type Member = {
  id: string;
  name: string;
  discord_id: string | null;
};

type MembersProps = {
  user: { id: string; email: string };
  initialMembers: Member[];
};

export default function Members({ user, initialMembers }: MembersProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [name, setName] = useState("");
  const [discordId, setDiscordId] = useState("");
  const [editing, setEditing] = useState<Member | null>(null);
  const [editName, setEditName] = useState("");
  const [editDiscord, setEditDiscord] = useState("");

  // ★ 検索クエリ
  const [search, setSearch] = useState("");

  // ★ Realtime 購読
  useEffect(() => {
    console.log("🔌 Realtime: useEffect START");

    const channel = supabase
      .channel("profiles-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          console.log("📡 EVENT:", payload.eventType);
          console.log("📡 NEW:", payload.new);
          console.log("📡 OLD:", payload.old);

          if (payload.eventType === "UPDATE") {
            console.log("✏ UPDATE DETECTED");
          }
        }
      )
      .subscribe((status) => {
        console.log("🔌 SUBSCRIBE STATUS:", status);
      });

    return () => {
      console.log("🔌 Removing channel");
      supabase.removeChannel(channel);
    };
  }, []);

  async function addMember() {
    const res = await fetch("/api/members/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, discord_id: discordId }),
    });

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      console.error("JSON parse error");
    }

    if (!res.ok) {
      console.error("メンバー追加エラー:", json?.error ?? res.statusText);
      alert("メンバー追加に失敗しました");
      return;
    }

    // Realtime が更新してくれるので setMembers は不要
    setName("");
    setDiscordId("");
  }

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

  function startEdit(member: Member) {
    setEditing(member);
    setEditName(member.name);
    setEditDiscord(member.discord_id ?? "");
  }

  async function saveEdit() {
    if (!editing) return;

    const res = await fetch("/api/members/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing.id,
        name: editName,
        discord_id: editDiscord,
      }),
    });

    if (!res.ok) {
      alert("更新に失敗しました");
      return;
    }

    // Realtime が更新してくれるので setMembers は不要
    setEditing(null);
  }

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

  return (
    <div style={{ padding: 20 }}>
      <h1>メンバー管理</h1>
      <p>ログイン中: {user.email}</p>

      <h2>検索</h2>
      <input
        placeholder="UID / 名前 / Discord ID で検索"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "300px", marginBottom: "20px" }}
      />

      <h2>新規メンバー追加</h2>
      <input
        placeholder="名前"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        placeholder="Discord ID"
        value={discordId}
        onChange={(e) => setDiscordId(e.target.value)}
      />
      <button onClick={addMember}>追加</button>
      {editing && (
        <div style={{ marginBottom: "20px", padding: "10px", border: "1px solid #ccc" }}>
          <h3>編集モード</h3>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="名前"
          />
          <input
            value={editDiscord}
            onChange={(e) => setEditDiscord(e.target.value)}
            placeholder="Discord ID"
          />
          <button onClick={saveEdit}>保存</button>
          <button onClick={() => setEditing(null)} style={{ marginLeft: "10px" }}>
            キャンセル
          </button>
        </div>
      )}
      <h2 style={{ marginTop: 30 }}>メンバー一覧</h2>
      <ul>
        {filteredMembers.map((m: Member) => (
          <li key={m.id} style={{ marginBottom: "10px" }}>
            <strong>{m.name}</strong>（Discord: {m.discord_id ?? "未登録"}）<br />
            UID: {m.id}

            {/* ボタンを右側に配置 */}
            <div style={{ marginTop: "5px" }}>
              <button
                onClick={() => startEdit(m)}
                style={{ marginRight: "10px" }}
              >
                編集
              </button>

              <button
                onClick={() => deleteMember(m.id)}
                style={{ color: "red" }}
              >
                削除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// SSR
export const getServerSideProps = async (ctx: any) => {
  const auth = await requireAdmin(ctx);

  if (!auth.ok) {
    return { redirect: auth.redirect };
  }

  // ★ SSR では service_role を使う（RLS 無視）
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
