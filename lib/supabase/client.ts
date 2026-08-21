import { createClient } from "@supabase/supabase-js";

export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    global: {
      fetch: async (url, options) => {
        console.log("=== Supabase fetch ===");
        console.log("URL:", url);
        console.log("Headers:", options?.headers);
        console.log("Credentials:", options?.credentials);
        console.log("Body:", options?.body);
        console.log("======================");

        return fetch(url, options);
      },
    },
  }
);
