import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import readline from "readline";

async function askPassword(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("管理者パスワードを入力してください: ", (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function setupAdmin() {
  const password = await askPassword();

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const hash = await bcrypt.hash(password, 10);

  const { error } = await supabaseAdmin.from("admins").insert({
    password_hash: hash,
  });

  if (error) {
    console.error("エラー:", error);
  } else {
    console.log("管理者パスワードを登録しました");
  }
}

setupAdmin();
