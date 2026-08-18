import { supabaseApi } from "@/lib/supabase/api";

// ① ロック状態チェック
export async function checkLockState(myUserId: string, myCategoryId: string) {
  const { data: lock } = await supabaseApi
    .from("shift_sync_state")
    .select("*")
    .single();

  if (!lock) throw new Error("ロック状態の取得に失敗しました");

  // 全員ロック
  if (lock.all_locked && lock.sync_locked) {
    throw new Error("現在全体同期中です。少し待ってください。");
  }

  // カテゴリーロック
  if (lock.target_category_id === myCategoryId && lock.sync_locked) {
    throw new Error("現在このカテゴリーは同期中です。少し待ってください。");
  }

  // ユーザーロック
  if (lock.target_user_id === myUserId && lock.sync_locked) {
    throw new Error("現在あなたのシフトは同期中です。少し待ってください。");
  }
}

// ② ロックON（ユーザー単位）
export async function lockUser(myUserId: string) {
  await supabaseApi
    .from("shift_sync_state")
    .update({
      target_user_id: myUserId,
      target_category_id: null,
      all_locked: false,
      sync_locked: true,
    });
}

// ③ ロックON（カテゴリー単位）
export async function lockCategory(categoryId: string) {
  await supabaseApi
    .from("shift_sync_state")
    .update({
      target_user_id: null,
      target_category_id: categoryId,
      all_locked: false,
      sync_locked: true,
    });
}

// ④ ロックON（全員）
export async function lockAll() {
  await supabaseApi
    .from("shift_sync_state")
    .update({
      target_user_id: null,
      target_category_id: null,
      all_locked: true,
      sync_locked: true,
    });
}

// ⑤ ロックOFF（同期終了）
export async function unlockAll() {
  await supabaseApi
    .from("shift_sync_state")
    .update({
      target_user_id: null,
      target_category_id: null,
      all_locked: false,
      sync_locked: false,
    });
}