// /pages/api/shift/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";       // ★サービスロール
import { supabaseAdmin } from "@/lib/supabase/admin";   // admin_session 用

// 型定義
type Profile = {
    id: string;
    user_id: string;
    name: string;
    discord_id: string | null;
};

type Shift = {
    user_id: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    is_confirmed: boolean;
    is_holiday: boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // -----------------------------
    // ① Cookie 認証（admin_session）
    // -----------------------------
    const token = req.cookies["admin_session"];
    if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    // -----------------------------
    // ② セッション確認
    // -----------------------------
    const { data: session } = await supabaseAdmin
        .from("admin_sessions")
        .select("admin_id")
        .eq("token", token)
        .maybeSingle();

    if (!session) {
        return res.status(401).json({ error: "Invalid session" });
    }

    // -----------------------------
    // ③ 管理者チェック
    // -----------------------------
    const { data: admin } = await supabaseAdmin
        .from("admins")
        .select("id")
        .eq("id", session.admin_id)
        .maybeSingle();

    if (!admin) {
        return res.status(403).json({ error: "Not admin" });
    }

    // -----------------------------
    // ④ リクエストされた期間を取得
    // -----------------------------
    const { startDate, endDate } = req.body as {
        startDate?: string;
        endDate?: string;
    };

    // -----------------------------
    // ⑤ profiles（全メンバー）
    // -----------------------------
    const { data: profiles, error: pErr } = await supabaseApi
        .from("profiles")
        .select("*");

    if (pErr) return res.status(500).json({ error: pErr.message });

    // -----------------------------
    // ⑥ shift_requests（期間フィルタ）
    // -----------------------------
    let query = supabaseApi.from("shift_requests").select("*");

    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    const { data: shifts, error: sErr } = await query;

    if (sErr) return res.status(500).json({ error: sErr.message });

    // -----------------------------
    // ⑦ 完了レスポンス
    // -----------------------------
    return res.status(200).json({
        profiles: profiles as Profile[],
        shifts: shifts as Shift[],
    });
}
