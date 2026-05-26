import { useState, useEffect, useMemo } from "react";
import { requireAdmin } from "@/lib/auth/adminAuth";
import { supabase } from "@/lib/supabase/client";

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

  // ★ 検索クエリ
  const [search, setSearch] = useState("");

  // ★ Realtime 購読
  useEffect(() => {
    const channel = supabase
      .channel("profiles-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          refreshMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function refreshMembers() {
    const { data } = await supabase.from("profiles").select("*").order("created_at");
    if (data) setMembers(data);
  }

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

      <h2 style={{ marginTop: 30 }}>メンバー一覧</h2>
      <ul>
        {filteredMembers.map((m: Member) => (
          <li key={m.id}>
            <strong>{m.name}</strong>（Discord: {m.discord_id ?? "未登録"}）<br />
            UID: {m.id}
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
    return {
      redirect: auth.redirect,
    };
  }

  const { data: members } = await supabase.from("profiles").select("*");

  return {
    props: {
      user: auth.user,
      initialMembers: members,
    },
  };
};
