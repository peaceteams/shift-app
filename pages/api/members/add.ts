// /pages/api/members/add.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("▶ API /members/add START");

  try {
    if (req.method !== "POST") {
      console.log("❌ Method not allowed:", req.method);
      return res.status(405).json({ error: "Method not allowed" });
    }

    console.log("▶ Step1: Create supabaseAuth client");
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    console.log("▶ Step2: Create supabaseAdmin client");
    console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log("▶ Step3: Read cookie");
    const accessToken = req.cookies["sb-access-token"];
    console.log("accessToken exists:", !!accessToken);

    if (!accessToken) {
      console.log("❌ No access token");
      return res.status(401).json({ error: "Not authenticated" });
    }

    console.log("▶ Step4: Auth getUser()");
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(accessToken);
    console.log("userError:", userError);
    console.log("userData:", userData);

    if (userError || !userData?.user) {
      console.log("❌ Invalid user");
      return res.status(401).json({ error: "Invalid user" });
    }

    const user = userData.user;
    console.log("▶ Authenticated user id:", user.id);

    console.log("▶ Step5: Admin check");
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    console.log("profileError:", profileError);
    console.log("profile:", profile);

    if (profileError) {
      console.log("❌ profileError:", profileError);
      return res.status(500).json({ error: profileError.message });
    }

    if (!profile?.is_admin) {
      console.log("❌ Not admin");
      return res.status(403).json({ error: "Not admin" });
    }

    console.log("▶ Step6: Insert member");
    const { name, discord_id } = req.body;
    console.log("Insert payload:", { name, discord_id });

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("profiles")
      .insert({
        name,
        discord_id: discord_id || null,
      })
      .select()
      .single();

    console.log("insertError:", insertError);
    console.log("inserted:", inserted);

    if (insertError) {
      console.log("❌ Insert error:", insertError);
      return res.status(500).json({ error: insertError.message });
    }

    console.log("🎉 SUCCESS:", inserted);
    return res.status(200).json({ member: inserted });

  } catch (e: any) {
    console.error("🔥 UNCAUGHT ERROR:", e);
    return res.status(500).json({ error: e.message });
  }
}
