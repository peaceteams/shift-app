import { createClient } from "@supabase/supabase-js";

export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true, // ★ Cookie を送るために必須
    },
    global: {
      fetch: async (url, options = {}) => {
        // ★ Cookie を送る設定を強制
        options.credentials = "include";

        console.log("=== Supabase fetch ===");
        console.log("URL:", url);
        console.log("Headers:", options.headers);
        console.log("Credentials:", options.credentials);
        console.log("Body:", options.body);
        console.log("======================");

        return fetch(url, options);
      },
    },
  }
);
