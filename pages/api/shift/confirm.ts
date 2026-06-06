import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { requireAdminAPI } from "@/lib/auth/api/requireAdminAPI";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await requireAdminAPI(req, res);
  if (!admin.ok) return;

  const { user_id, start, end } = req.body;

  if (!user_id || !start || !end) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from("shift_requests")
    .update({ is_confirmed: true })
    .eq("user_id", user_id)
    .gte("date", start)
    .lte("date", end);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
