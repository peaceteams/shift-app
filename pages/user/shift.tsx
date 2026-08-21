import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { GetServerSidePropsContext } from "next";
import { requireUser } from "@/lib/auth/page/userAuth";
import { supabaseClient } from "@/lib/supabase/client";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useLoading } from "@/hooks/useLoading";

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
    const auth = await requireUser(ctx);

    if (!auth.ok) {
        return auth.redirect;
    }

    return {
        props: {
            user: auth.user,
        },
    };
}

// 秒を消す
function trimSeconds(time: string) {
    if (!time) return "";
    return time.slice(0, 5); // "20:00:00" → "20:00"
}

export default function ShiftSubmitPage({ user }: { user: any }) {
    const { loading, wrap } = useLoading();

    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");

    type ShiftData = {
        start: string | null;
        end: string | null;
        is_confirmed?: boolean;
        is_holiday?: boolean;
    };

    const [shifts, setShifts] = useState<Record<string, ShiftData>>({});
    const [mounted, setMounted] = useState(false);

    const [startHour, setStartHour] = useState("00");
    const [startMin, setStartMin] = useState("00");
    const [endHour, setEndHour] = useState("00");
    const [endMin, setEndMin] = useState("00");

    // 🟥 二度ロード防止フラグ
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        console.log("🟦 useEffect START user:", user);

        if (!user) {
            console.log("⚠ user がまだ undefined → useEffect return");
            return;
        }

        setMounted(true);
        console.log("🟩 user が読み込まれた:", user.id);

        // 初回ロード
        wrap(async () => {
            console.log("📥 初回 fetchShiftsFromDB 実行");
            await fetchShiftsFromDB();
            console.log("📤 初回 fetchShiftsFromDB 完了");
        });

        // -----------------------------
        // 🔌 Realtime 購読開始
        // -----------------------------
        console.log("🔌 Realtime チャンネル作成開始");

        const channel = supabaseClient.channel("shift-rt-user");
        channel.on(
            "postgres_changes",
            { event: "*", schema: "public", table: "shift_requests" },
            (payload) => {
                console.log("🔥 Realtime受信:", payload);

                // 👇 payload.new を any として扱う（TSエラーを完全に消す）
                const row = (payload.new ?? payload.old) as any;

                if (!row) return;
                if (!row.user_id) return;
                if (row.user_id !== user.id) return;

                wrap(async () => {
                await fetchShiftsFromDB();
                setIsSyncing(false);
                });
            }
        );

        channel.subscribe((status) => {
        console.log("📡 Realtime subscribe 状態:", status);
        });

        console.log("🔌 Realtime チャンネル作成完了");

        return () => {
            console.log("🔌 Realtime チャンネル解除");
            supabaseClient.removeChannel(channel);
        };
    }, [user]);

    async function fetchShiftsFromDB() {
        const res = await fetch("/api/shift/get");
        const json = await res.json();

        if (res.ok) {
            const formatted = Object.fromEntries(
                Object.entries(json.shifts).map(([date, v]) => {
                    const val = v as any;
                    return [
                        date,
                        {
                            start: trimSeconds(val.start),
                            end: trimSeconds(val.end),
                            is_confirmed: val.is_confirmed ?? false,
                            is_holiday: val.is_holiday ?? false,
                        },
                    ];
                })
            );
            setShifts(formatted);
        }
    }

    function openModal(date: Date) {
        const key = date.toLocaleDateString("sv-SE");
        setSelectedDate(date);
        setStart(shifts[key]?.start ?? "");
        setEnd(shifts[key]?.end ?? "");
    }

    async function saveShift() {
        if (!selectedDate) return;
        if (isSyncing) return;

        setIsSyncing(true);

        const start = `${startHour}:${startMin}`;
        const end = `${endHour}:${endMin}`;
        const key = selectedDate.toLocaleDateString("sv-SE");

        const startDate = new Date(`2000-01-01T${start}`);
        const endDate = new Date(`2000-01-01T${end}`);

        if (endDate <= startDate) {
            alert("終了時間は開始時間より後にしてください。");
            setIsSyncing(false);
            return;
        }

        await wrap(async () => {
            // 🟥 ① ロックチェック
            const { data: lock } = await supabaseClient
            .from("shift_sync_state")
            .select("sync_locked")
            .eq("user_id", user.id)
            .maybeSingle();

            if (!lock) {
            alert("Lock state not found");
            setIsSyncing(false);
            return;
            }

            if (lock.sync_locked) {
            alert("現在あなたのシフトは同期中のため変更できません。");
            setIsSyncing(false);
            return;
            }

            // 🟦 ② ロックON
            await supabaseClient
            .from("shift_sync_state")
            .update({
                sync_locked: true,
                locked_by: user.id,
                locked_at: new Date(),
            })
            .eq("user_id", user.id);

            // 🟩 ③ 既存削除
            await supabaseClient
            .from("shift_requests")
            .delete()
            .eq("user_id", user.id)
            .eq("date", key);

            // 🟩 ④ 新規保存（Realtime が確実に飛ぶ）
            await supabaseClient
            .from("shift_requests")
            .insert({
                user_id: user.id,
                date: key,
                start_time: start,
                end_time: end,
                is_holiday: false,
            });

            // 🟦 ⑤ ロックOFF
            await supabaseClient
            .from("shift_sync_state")
            .update({
                sync_locked: false,
                locked_by: null,
                locked_at: null,
            })
            .eq("user_id", user.id);

            setSelectedDate(null);
        });
    }

    async function deleteShift() {
        if (!selectedDate) return;
        if (isSyncing) return;

        setIsSyncing(true);

        await wrap(async () => {
            const key = selectedDate.toLocaleDateString("sv-SE");

            const res = await fetch("/api/shift/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: key }),
            });

            const json = await res.json();

            if (!res.ok) {
                alert(json.error ?? "削除に失敗しました");
                setIsSyncing(false);
                return;
            }

            setSelectedDate(null);
        });
    }

    async function markHoliday() {
        if (!selectedDate) return;
        if (isSyncing) return;

        setIsSyncing(true);

        await wrap(async () => {
            const key = selectedDate.toLocaleDateString("sv-SE");

            setShifts((prev) => ({
                ...prev,
                [key]: {
                    start: null,
                    end: null,
                    is_holiday: true,
                    is_confirmed: prev[key]?.is_confirmed ?? false,
                },
            }));

            const res = await fetch("/api/shift/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: key,
                    start: null,
                    end: null,
                    is_holiday: true,
                }),
            });

            const json = await res.json();

            if (!res.ok) {
                alert(json.error ?? "休み希望の保存に失敗しました");
                setIsSyncing(false);
                return;
            }

            setSelectedDate(null);
        });
    }

    return (
        <>
            <LoadingOverlay loading={loading} />

            {mounted && (
                <div style={{ padding: 20 }}>
                    <h1 style={{ textAlign: "center" }}>シフト提出</h1>

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            marginTop: 40,
                        }}
                    >
                        <Calendar
                            onClickDay={(date) => {
                                if (loading) return;
                                openModal(date);
                            }}
                            tileDisabled={({ date, view }) => {
                                if (view !== "month") return false;

                                const today = new Date();
                                today.setHours(0, 0, 0, 0);

                                const key = date.toLocaleDateString("sv-SE");
                                const shift = shifts[key];

                                return (
                                    date < today ||
                                    shift?.is_confirmed === true
                                );
                            }}
                            tileContent={({ date, view }) => {
                                if (view !== "month") return null;

                                const key = date.toLocaleDateString("sv-SE");
                                const shift = shifts[key];

                                if (shift?.is_holiday) {
                                    return (
                                        <div
                                            style={{
                                                height: "32px",
                                                fontSize: 8,
                                                color: "red",
                                                fontWeight: "bold",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            休み希望
                                        </div>
                                    );
                                }

                                const start = shift?.start ?? null;
                                const end = shift?.end ?? null;

                                return (
                                    <div
                                        style={{
                                            fontSize: 12,
                                            color: start && end ? "green" : "#aaa",
                                            height: "32px",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            lineHeight: "14px",
                                        }}
                                    >
                                        {start && end ? (
                                            <>
                                                <span>{start}</span>
                                                <span>{end}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>–</span>
                                                <span>–</span>
                                            </>
                                        )}
                                    </div>
                                );
                            }}
                        />
                    </div>

                    {selectedDate && (
                        <div
                            style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                width: "100vw",
                                height: "100vh",
                                background: "rgba(0,0,0,0.5)",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <div
                                style={{
                                    background: "white",
                                    padding: 20,
                                    borderRadius: 8,
                                }}
                            >
                                <h3>{selectedDate.toLocaleDateString()} のシフト</h3>

                                {/* 開始時間 */}
                                <div
                                    style={{
                                        display: "flex",
                                        gap: 20,
                                        marginBottom: 20,
                                        justifyContent: "center",
                                    }}
                                >
                                    <select
                                        value={startHour}
                                        onChange={(e) => setStartHour(e.target.value)}
                                        style={{
                                            fontSize: "20px",
                                            padding: "10px 14px",
                                            borderRadius: "8px",
                                            width: "100px",
                                            textAlign: "center",
                                        }}
                                    >
                                        {Array.from({ length: 24 }).map((_, h) => {
                                            const hh = String(h).padStart(2, "0");
                                            return (
                                                <option key={hh} value={hh}>
                                                    {hh}
                                                </option>
                                            );
                                        })}
                                    </select>

                                    <select
                                        value={startMin}
                                        onChange={(e) => setStartMin(e.target.value)}
                                        style={{
                                            fontSize: "20px",
                                            padding: "10px 14px",
                                            borderRadius: "8px",
                                            width: "100px",
                                            textAlign: "center",
                                        }}
                                    >
                                        {["00", "15", "30", "45"].map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 終了時間 */}
                                <div
                                    style={{
                                        display: "flex",
                                        gap: 20,
                                        marginBottom: 20,
                                        justifyContent: "center",
                                    }}
                                >
                                    <select
                                        value={endHour}
                                        onChange={(e) => setEndHour(e.target.value)}
                                        style={{
                                            fontSize: "20px",
                                            padding: "10px 14px",
                                            borderRadius: "8px",
                                            width: "100px",
                                            textAlign: "center",
                                        }}
                                    >
                                        {Array.from({ length: 24 }).map((_, h) => {
                                            const hh = String(h).padStart(2, "0");
                                            return (
                                                <option key={hh} value={hh}>
                                                    {hh}
                                                </option>
                                            );
                                        })}
                                    </select>

                                    <select
                                        value={endMin}
                                        onChange={(e) => setEndMin(e.target.value)}
                                        style={{
                                            fontSize: "20px",
                                            padding: "10px 14px",
                                            borderRadius: "8px",
                                            width: "100px",
                                            textAlign: "center",
                                        }}
                                    >
                                        {["00", "15", "30", "45"].map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button onClick={markHoliday}>休み希望</button>
                                <button onClick={saveShift} style={{ marginLeft: 10 }}>
                                    保存
                                </button>
                                <button
                                    onClick={deleteShift}
                                    style={{ marginLeft: 10, color: "red" }}
                                >
                                    削除
                                </button>
                                <button
                                    onClick={() => setSelectedDate(null)}
                                    style={{ marginLeft: 10 }}
                                >
                                    キャンセル
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};
