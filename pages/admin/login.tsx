import { createClient } from "@supabase/supabase-js";
import { useState } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function login() {
    console.log("▶ ログイン開始");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("▶ Supabase からの返り値:", { data, error });

    if (error) {
      console.log("▶ ログインエラー:", error);
      setError("ログインに失敗しました");
      return;
    }

    console.log("▶ ログイン成功！Cookie が保存されているか確認:", document.cookie);

    // window.location.href = "/admin";
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>管理者ログイン</h1>

      <input
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button onClick={login}>ログイン</button>
    </div>
  );
}
