// pages/shift/[token].tsx
import { GetServerSideProps } from "next";
import { createClient } from "@supabase/supabase-js";

type Props = {
  valid: boolean;
  userId?: string;
  alreadySubmitted?: boolean;
};

export default function ShiftPage({ valid, userId, alreadySubmitted }: Props) {
  if (!valid) {
    return <h1>このリンクは無効です。</h1>;
  }

  if (alreadySubmitted) {
    return <h1>シフトはすでに提出済みです。</h1>;
  }

  return (
    <div>
      <h1>シフト提出ページ</h1>
      <p>ユーザーID: {userId}</p>

      {/* ここに後でフォームを追加する */}
      <p>ここにシフト提出フォームが入ります。</p>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const token = ctx.params?.token as string;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ① token が shift_links に存在するか確認
  const { data: link, error } = await supabaseAdmin
    .from("shift_links")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();

  if (!link || error) {
    return { props: { valid: false } };
  }

  const userId = link.user_id;

  // ② すでに提出済みか確認
  const { data: submitted } = await supabaseAdmin
    .from("shift_requests")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  const alreadySubmitted = submitted && submitted.length > 0;

  return {
    props: {
      valid: true,
      userId,
      alreadySubmitted,
    },
  };
};
