// /api/shift/submit.ts
import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parse } from "cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("▶ /api/shift/submit START");

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Cookie 読み取り
    const cookies = parse(req.headers.cookie || "");
    const token = cookies["user_session"];

    if (!token) {
      return res.status(401).json({ error: "Not logged in" });
    }

    // user_sessions から user_id を取得
    const { data: session } = await supabaseAdmin
      .from("user_sessions")
      .select("user_id")
      .eq("token", token)
      .maybeSingle();

    if (!session) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const userId = session.user_id;

    // リクエスト body
    const { date, start, end, is_holiday } = req.body;

    if (!date) {
      return res.status(400).json({ error: "date is required" });
    }

    // ---------------------------------------------------------
    // 🟥 ① ユーザー単位ロックチェック
    // ---------------------------------------------------------
    const { data: lock } = await supabaseAdmin
      .from("shift_sync_state")
      .select("sync_locked")
      .eq("user_id", userId)
      .maybeSingle();

    if (!lock) {
      return res.status(500).json({ error: "Lock state not found" });
    }

    if (lock.sync_locked) {
      return res.status(409).json({
        error: "現在あなたのシフトは同期中のため変更できません。",
      });
    }

    // ---------------------------------------------------------
    // 🟦 ② ロックON（ユーザー単位）
    // ---------------------------------------------------------
    await supabaseAdmin
      .from("shift_sync_state")
      .update({
        sync_locked: true,
        locked_by: userId,
        locked_at: new Date(),
      })
      .eq("user_id", userId);

    // ---------------------------------------------------------
    // 🟩 ③ 既存削除
    // ---------------------------------------------------------
    const { error: deleteError } = await supabaseAdmin
      .from("shift_requests")
      .delete()
      .eq("user_id", userId)
      .eq("date", date);

    if (deleteError) {
      await unlockUser(userId);
      return res.status(500).json({ error: deleteError.message });
    }

    // ---------------------------------------------------------
    // 🟩 ④ 新規保存
    // ---------------------------------------------------------
    const { error: insertError } = await supabaseAdmin
      .from("shift_requests")
      .insert({
        user_id: userId,
        date,
        start_time: start,
        end_time: end,
        is_holiday: is_holiday === true,
      });

    if (insertError) {
      await unlockUser(userId);
      return res.status(500).json({ error: insertError.message });
    }

    // ---------------------------------------------------------
    // 🟦 ⑤ ロックOFF（同期終了）
    // ---------------------------------------------------------
    await unlockUser(userId);

    return res.status(200).json({ ok: true });

  } catch (e: any) {
    console.error("🔥 UNCAUGHT ERROR:", e);
    return res.status(500).json({ error: e.message });
  }
}

async function unlockUser(userId: string) {
  await supabaseAdmin
    .from("shift_sync_state")
    .update({
      sync_locked: false,
      locked_by: null,
      locked_at: null,
    })
    .eq("user_id", userId);
}
