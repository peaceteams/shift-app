// /pages/api/members/check-can-delete.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing id" });
  }

  const { data, error } = await supabaseAdmin
    .from("shift_requests")
    .select("id")
    .eq("user_id", id)
    .limit(1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const hasShift = (data?.length ?? 0) > 0;

  return res.status(200).json({ hasShift });
}
