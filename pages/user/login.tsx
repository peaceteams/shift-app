import { useState } from "react";
import Router from "next/router";

export default function UserLoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");

    const res = await fetch("/api/user/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        password,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "ログインに失敗しました");
      return;
    }

    // ログイン成功 → shift ページへ
    Router.push("/user/my-page");
  }

  return (
    <div style={{ padding: 40, maxWidth: 400, margin: "0 auto" }}>
      <h1>ユーザーログイン</h1>

      <input
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        placeholder="ユーザーID（番号）"
        style={{ width: "100%", marginBottom: 10 }}
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="パスワード"
        style={{ width: "100%", marginBottom: 10 }}
      />

      {error && (
        <div style={{ color: "red", marginBottom: 10 }}>{error}</div>
      )}

      <button onClick={handleLogin} style={{ width: "100%" }}>
        ログイン
      </button>
    </div>
  );
}
