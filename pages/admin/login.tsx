import { createClient } from "@supabase/supabase-js";
import { useState, useMemo } from "react";

export default function AdminLogin() {
  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false, // ★ Cookie を使わない
        },
      }
    );
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function login() {
    console.log("▶ ログイン開始");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("▶ Supabase 返り値:", data, error);

    if (error) {
      setError("ログイン失敗");
      return;
    }

    // ★ API に token を送る
    await fetch("/api/set-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      }),
    });

    window.location.href = "/admin";
  }

  return (
    <div>
      <h1>管理者ログイン</h1>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={login}>ログイン</button>
      {error && <p>{error}</p>}
    </div>
  );
}
