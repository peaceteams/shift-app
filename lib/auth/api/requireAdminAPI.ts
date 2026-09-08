import { NextApiRequest, NextApiResponse } from "next";
import { parse } from "cookie";
import { supabaseApi } from "@/lib/supabase/api";

export async function requireAdminAPI(req: NextApiRequest, res: NextApiResponse) {
  console.log("[requireAdminAPI] START");
  console.log("[requireAdminAPI] URL:", req.url);
  console.log("[requireAdminAPI] cookies:", req.headers.cookie);

  const cookies = parse(req.headers.cookie || "");
  const token = cookies.admin_session;

  console.log("[requireAdminAPI] token:", token);

  if (!token) {
    console.log("[requireAdminAPI] ❌ No admin_session cookie");
    res.status(401).json({ error: "Not admin" });
    return { ok: false };
  }

  const { data, error } = await supabaseApi
    .from("admin_sessions")
    .select("admin_id")
    .eq("token", token)
    .maybeSingle();

  console.log("[requireAdminAPI] session data:", data);
  console.log("[requireAdminAPI] session error:", error);

  if (error || !data) {
    console.log("[requireAdminAPI] ❌ Invalid admin session");
    res.status(401).json({ error: "Invalid admin session" });
    return { ok: false };
  }

  console.log("[requireAdminAPI] ✅ SUCCESS admin_id:", data.admin_id);
  return { ok: true, admin_id: data.admin_id };
}
