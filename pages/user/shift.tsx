import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { GetServerSidePropsContext } from "next";
import { requireUser } from "@/lib/auth/page/userAuth";
import { supabaseClient } from "@/lib/supabase/client";

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

// API通知
async function notifyShiftUpdated() {
    await fetch("/api/shift/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "shift_updated" }),
    });
}

export default function ShiftSubmitPage() {
    // 選択した日付
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // 設定する日時
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");

    // 全シフト
    type ShiftData = {
        start: string | null;
        end: string | null;
        is_confirmed?: boolean;
        is_holiday?: boolean;
    };

    const [shifts, setShifts] = useState<Record<string, ShiftData>>({});

    // ロード関係
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    // シフト保存
    const [saving, setSaving] = useState(false);

    // シフト削除
    const [deleting, setDeleting] = useState(false);

    // シフト時間
    const [startHour, setStartHour] = useState("00");
    const [startMin, setStartMin] = useState("00");
    const [endHour, setEndHour] = useState("00");
    const [endMin, setEndMin] = useState("00");

    useEffect(() => {
        setMounted(true);
        fetchShiftsFromDB();
    }, []);

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
        setLoading(false);
    }

    function openModal(date: Date) {
        const key = date.toLocaleDateString("sv-SE");
        setSelectedDate(date);
        setStart(shifts[key]?.start ?? "");
        setEnd(shifts[key]?.end ?? "");
    }

    async function saveShift() {
        if (!selectedDate) return;

        const start = `${startHour}:${startMin}`;
        const end = `${endHour}:${endMin}`;

        const key = selectedDate.toLocaleDateString("sv-SE");
        const startDate = new Date(`2000-01-01T${start}`);
        const endDate = new Date(`2000-01-01T${end}`);

        if (endDate <= startDate) {
            alert("終了時間は開始時間より後にしてください。");
            return;
        }

        setSaving(true);

        // API 保存
        const res = await fetch("/api/shift/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                date: key,
                start,
                end,
            }),
        });

        const json = await res.json();
        setSaving(false);

        if (!res.ok) {
            alert(json.error ?? "保存に失敗しました");
            return;
        }

        // ローカル更新
        setShifts((prev) => ({
            ...prev,
            [key]: { start, end },
        }));

        // ★ 通知送信
        await notifyShiftUpdated();

        setSelectedDate(null);
    }

    async function deleteShift() {
        if (!selectedDate) return;
        setDeleting(true);

        const key = selectedDate.toLocaleDateString("sv-SE"); // ← 修正

        const res = await fetch("/api/shift/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: key }),
        });

        const json = await res.json();

        if (!res.ok) {
            setDeleting(false);
            alert(json.error ?? "削除に失敗しました");
            return;
        }

        // ★ 通知送信
        await notifyShiftUpdated();

        setShifts((prev) => {
            const copy = { ...prev };
            delete copy[key];
            return copy;
        });

        setDeleting(false);
        setSelectedDate(null);
    }

    async function markHoliday() {
        if (!selectedDate) return;

        const key = selectedDate.toLocaleDateString("sv-SE");

        setSaving(true);

        // API 保存
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
        setSaving(false);

        if (!res.ok) {
            alert(json.error ?? "休み希望の保存に失敗しました");
            return;
        }

        // ローカル更新
        setShifts((prev) => ({
            ...prev,
            [key]: {
                start: null,
                end: null,
                is_holiday: true,
                is_confirmed: prev[key]?.is_confirmed ?? false,
            },
        }));

        // ★ 通知送信
        await notifyShiftUpdated();

        setSelectedDate(null);
    }

    if(mounted){
        return (
            <div style={{ padding: 20 }}>

            <h1 style={{ textAlign: "center" }}>シフト提出</h1>
            
            <div
                style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 40,
            }}>

                <Calendar
                    onClickDay={(date) => {
                        if (loading) return; // ← ロード中は無効化
                        openModal(date);
                    }}
                    tileDisabled={({ date, view }) => {
                        if (view !== "month") return false;

                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const key = date.toLocaleDateString("sv-SE");
                        const shift = shifts[key];

                        return (
                            loading ||  // ← ロード中は無効
                            date < today || // ← 過去日は無効
                            shift?.is_confirmed === true
                        );
                    }}
                    tileContent={({ date, view }) => {
                        if (view !== "month") return null;
                        if (loading) {
                            return <div style={{ height: "32px" }}></div>;
                        }

                        const key = date.toLocaleDateString("sv-SE");
                        const shift = shifts[key];

                        // ★ 休み希望
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

                    <div style={{ background: "white", padding: 20, borderRadius: 8, pointerEvents: saving || deleting ? "none" : "auto" }}>
                        <h3>{selectedDate.toLocaleDateString()} のシフト</h3>

                        <div
                            style={{
                                display: "flex",
                                gap: 20,
                                marginBottom: 20,
                                justifyContent: "center", // ← 中央寄せ
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

                        <div
                            style={{
                                display: "flex",
                                gap: 20,
                                marginBottom: 20,
                                justifyContent: "center", // ← 中央寄せ
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
                        <button onClick={markHoliday}>{saving ? "保存中..." : "休み希望"}</button>

                        <button onClick={saveShift} style={{ marginLeft: 10 }}>{saving ? "保存中..." : "保存"}</button>

                        <button onClick={deleteShift} style={{ marginLeft: 10, color: "red" }}>{deleting ? "削除中..." : "削除"}</button>

                        <button onClick={() => setSelectedDate(null)} style={{ marginLeft: 10 }}>キャンセル</button>
                    </div>
                </div>
            )}
            
            </div>
        );
    }   
};