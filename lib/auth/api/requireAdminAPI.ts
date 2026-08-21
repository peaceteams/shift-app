// lib/auth/requireAdminAPI.ts
import { NextApiRequest, NextApiResponse } from "next";
import { parse } from "cookie";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

export async function requireAdminAPI(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parse(req.headers.cookie || "");

  // ★ Supabase が読む JWT（RLS用）
  const jwtToken =
    cookies[`sb-${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}-auth-token`];

  if (!jwtToken) {
    res.status(401).json({ error: "Not admin" });
    return { ok: false };
  }

  // ★ JWT を検証（role=admin）
  let decoded: jwt.JwtPayload;
  try {
    decoded = jwt.verify(jwtToken, process.env.JWT_SECRET!) as jwt.JwtPayload;

    if (decoded.role !== "admin") {
      res.status(401).json({ error: "Not admin" });
      return { ok: false };
    }
  } catch {
    res.status(401).json({ error: "Invalid JWT" });
    return { ok: false };
  }

  // ★ Supabase に JWT を送るクライアント（RLSが動く）
  const supabaseRLS = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${jwtToken}`, // ← これが RLS を動かす
        },
      },
    }
  );

  return {
    ok: true,
    admin_id: decoded.sub,
    supabaseRLS, // ← API側でこれを使って SELECT / UPDATE する
  };
}
