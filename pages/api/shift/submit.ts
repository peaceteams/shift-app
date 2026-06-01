// /api/shift/submit.ts
import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
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

    // Supabase Admin Client
    console.log("▶ Create supabaseAdmin client");
    console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

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
    console.log("▶ Authenticated user id:", userId);

    // リクエスト body
    const { date, start, end } = req.body;
    console.log("▶ Request body:", { date, start, end });

    if (!date) {
      console.log("❌ date is missing");
      return res.status(400).json({ error: "date is required" });
    }

    // 既存削除
    console.log("▶ Delete existing shift for:", { userId, date });
    const { error: deleteError } = await supabaseAdmin
      .from("shift_requests")
      .delete()
      .eq("user_id", userId)
      .eq("date", date);

    console.log("deleteError:", deleteError);

    if (deleteError) {
      console.log("❌ Delete failed:", deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    // 新規保存
    console.log("▶ Insert new shift:", {
      user_id: userId,
      date,
      start_time: start,
      end_time: end,
    });

    const { error: insertError } = await supabaseAdmin
      .from("shift_requests")
      .insert({
        user_id: userId,
        date,
        start_time: start,
        end_time: end,
      });

    console.log("insertError:", insertError);

    if (insertError) {
      console.log("❌ Insert failed:", insertError);
      return res.status(500).json({ error: insertError.message });
    }

    console.log("🎉 SUCCESS: shift saved");
    return res.status(200).json({ ok: true });

  } catch (e: any) {
    console.error("🔥 UNCAUGHT ERROR:", e);
    return res.status(500).json({ error: e.message });
  }
}
