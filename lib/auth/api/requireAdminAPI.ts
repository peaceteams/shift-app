// lib/auth/requireAdminAPI.ts
import { NextApiRequest, NextApiResponse } from "next";
import { parse } from "cookie";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

export async function requireAdminAPI(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const cookies = parse(req.headers.cookie || "");

  // ★ Supabase が読む JWT（RLS用）
  const jwtToken =
    cookies[`sb-${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}-auth-token`];

  console.log("JWT token:", jwtToken);

  if (!jwtToken) {
    res.status(401).json({ error: "Not admin" });
    return { ok: false };
  }

  // ★ JWT を検証（role=admin）
  let decoded: jwt.JwtPayload;
  try {
    decoded = jwt.verify(jwtToken, process.env.JWT_SECRET!) as jwt.JwtPayload;
    console.log("decoded JWT:", decoded);

    if (decoded.role !== "admin") {
      res.status(401).json({ error: "Not admin" });
      return { ok: false };
    }
  } catch (e) {
    console.log("JWT verify error:", e);
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
          Authorization: `Bearer ${jwtToken}`,
        },
      },
    }
  );

  console.log("Authorization header:", `Bearer ${jwtToken}`);

  return {
    ok: true,
    admin_id: decoded.sub,
    supabaseRLS,
  };
}
