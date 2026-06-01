import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // まず全行を取得
  const { data: rows, error: selectError } = await supabaseAdmin
    .from("shift_links")
    .select("token");

  if (selectError) {
    console.error("SELECT ERROR:", selectError);
    return res.status(500).json({ error: selectError.message });
  }

  // 行が無ければ終了
  if (!rows || rows.length === 0) {
    return res.status(200).json({ ok: true });
  }

  // 1件ずつ削除（WHERE token = ...）
  for (const row of rows) {
    const { error: deleteError } = await supabaseAdmin
      .from("shift_links")
      .delete()
      .eq("token", row.token);

    if (deleteError) {
      console.error("DELETE ERROR:", deleteError);
      return res.status(500).json({ error: deleteError.message });
    }
  }

  return res.status(200).json({ ok: true });
}
