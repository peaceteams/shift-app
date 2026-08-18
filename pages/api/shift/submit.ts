// /api/shift/submit.ts
import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parse } from "cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("▶ /api/shift/submit START");

  try {
    if (req.method !== "POST") {
      console.log("❌ Method not allowed:", req.method);
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Cookie 読み取り
    const cookies = parse(req.headers.cookie || "");
    const token = cookies["user_session"];
    console.log("▶ Cookie token exists:", !!token);

    if (!token) {
      console.log("❌ No user_session cookie");
      return res.status(401).json({ error: "Not logged in" });
    }

    // user_sessions から user_id を取得
    console.log("▶ Fetch user session from DB");
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("user_sessions")
      .select("user_id")
      .eq("token", token)
      .maybeSingle();

    console.log("session:", session);
    console.log("sessionError:", sessionError);

    if (sessionError || !session) {
      console.log("❌ Invalid session");
      return res.status(401).json({ error: "Invalid session" });
    }

    const userId = session.user_id;
    const categoryId = session.category_id; // ← カテゴリー判定に使う
    console.log("▶ Authenticated user id:", userId);

    // リクエスト body
    const { date, start, end, is_holiday } = req.body;
    console.log("▶ Request body:", { date, start, end, is_holiday });

    if (!date) {
      console.log("❌ date is missing");
      return res.status(400).json({ error: "date is required" });
    }

    // ---------------------------------------------------------
    // 🟥 ① ロック状態チェック（同期ロックシステム）
    // ---------------------------------------------------------
    const { data: lock } = await supabaseAdmin
      .from("shift_sync_state")
      .select("*")
      .single();

    if (!lock) {
      return res.status(500).json({ error: "Lock state not found" });
    }

    const isLocked =
      (lock.all_locked && lock.sync_locked) ||
      (lock.target_category_id === categoryId && lock.sync_locked) ||
      (lock.target_user_id === userId && lock.sync_locked);

    if (isLocked) {
      return res.status(409).json({
        error: "現在データが同期中のため正常に変更できませんでした。しばらく時間をおいてから再度お試しください。",
      });
    }

    // ---------------------------------------------------------
    // 🟦 ② ロックON（ユーザー単位）
    // ---------------------------------------------------------
    await supabaseAdmin
      .from("shift_sync_state")
      .update({
        target_user_id: userId,
        target_category_id: null,
        all_locked: false,
        sync_locked: true,
      });

    // ---------------------------------------------------------
    // 🟩 ③ 既存削除
    // ---------------------------------------------------------
    console.log("▶ Delete existing shift for:", { userId, date });
    const { error: deleteError } = await supabaseAdmin
      .from("shift_requests")
      .delete()
      .eq("user_id", userId)
      .eq("date", date);

    if (deleteError) {
      console.log("❌ Delete failed:", deleteError);
      // ロック解除してから返す
      await supabaseAdmin.from("shift_sync_state").update({
        target_user_id: null,
        target_category_id: null,
        all_locked: false,
        sync_locked: false,
      });
      return res.status(500).json({ error: deleteError.message });
    }

    // ---------------------------------------------------------
    // 🟩 ④ 新規保存
    // ---------------------------------------------------------
    console.log("▶ Insert new shift:", {
      user_id: userId,
      date,
      start_time: start,
      end_time: end,
      is_holiday: is_holiday === true,
    });

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
      console.log("❌ Insert failed:", insertError);
      // ロック解除してから返す
      await supabaseAdmin.from("shift_sync_state").update({
        target_user_id: null,
        target_category_id: null,
        all_locked: false,
        sync_locked: false,
      });
      return res.status(500).json({ error: insertError.message });
    }

    // ---------------------------------------------------------
    // 🟦 ⑤ ロックOFF（同期終了）
    // ---------------------------------------------------------
    await supabaseAdmin
      .from("shift_sync_state")
      .update({
        target_user_id: null,
        target_category_id: null,
        all_locked: false,
        sync_locked: false,
      });

    console.log("🎉 SUCCESS: shift saved");
    return res.status(200).json({ ok: true });

  } catch (e: any) {
    console.error("🔥 UNCAUGHT ERROR:", e);

    // ロック解除（念のため）
    await supabaseAdmin
      .from("shift_sync_state")
      .update({
        target_user_id: null,
        target_category_id: null,
        all_locked: false,
        sync_locked: false,
      });

    return res.status(500).json({ error: e.message });
  }
}
