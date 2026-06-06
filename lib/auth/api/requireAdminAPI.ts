// lib/auth/requireAdminAPI.ts
import { NextApiRequest, NextApiResponse } from "next";
import { parse } from "cookie";
import { createClient } from "@supabase/supabase-js";

export async function requireAdminAPI(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parse(req.headers.cookie || "");
  const token = cookies.admin_session;

  if (!token) {
    res.status(401).json({ error: "Not admin" });
    return { ok: false };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("admin_sessions")
    .select("admin_id")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    res.status(401).json({ error: "Invalid admin session" });
    return { ok: false };
  }

  return { ok: true, admin_id: data.admin_id };
}
