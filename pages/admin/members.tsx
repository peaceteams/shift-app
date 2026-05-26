import { GetServerSideProps } from "next";
import { createClient } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import { requireAdmin } from "@/lib/auth/adminAuth";

// ★ メンバー型を定義
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

  // ★ Supabase クライアント（フロント用）
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ★ 初回ロード + Realtime 購読
  useEffect(() => {
    // Realtime チャンネル
    const channel = supabase
      .channel("members-realtime")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT / UPDATE / DELETE 全部
          schema: "public",
          table: "profiles", // ← メンバーを profiles に入れてるのでここ
        },
        (payload) => {
          console.log("Realtime event:", payload);

          // 最新データを再取得
          refreshMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ★ 最新メンバー一覧を取得
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

    // ★ Realtime があるので setMembers は不要
    setName("");
    setDiscordId("");
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>メンバー管理</h1>
      <p>ログイン中: {user.email}</p>

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
        {members.map((m: Member) => (
          <li key={m.id}>
            {m.name}（Discord: {m.discord_id ?? "未登録"}）  
            <br />
            UID: {m.id}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ★ SSR 認証 + メンバー一覧取得
export const getServerSideProps = async (ctx: any) => {
  const auth = await requireAdmin(ctx);

  if (!auth.ok) {
    return {
      redirect: auth.redirect,
    };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: members } = await supabase.from("profiles").select("*");

  return {
    props: {
      user: auth.user,
      initialMembers: members,
    },
  };
};
