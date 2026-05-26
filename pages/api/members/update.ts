// /pages/api/members/update.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // RLS 無視
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { id, name, discord_id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Missing id" });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({
      name,
      discord_id: discord_id || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ member: data });
}
