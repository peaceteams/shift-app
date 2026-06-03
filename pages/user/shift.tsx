import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { supabase } from "@/lib/supabase/client";

// 秒を消す
function trimSeconds(time: string) {
    if (!time) return "";
    return time.slice(0, 5); // "20:00:00" → "20:00"
}

export default function ShiftSubmitPage() {
    // 選択した日付
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // 設定する日時
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");

    // 全シフト
    const [shifts, setShifts] = useState<Record<string, { start: string; end: string }>>({});

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

    // ユーザー情報
    const [profile, setProfile] = useState<any>(null);

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
            const val = v as { start: string; end: string };
            return [
                date,
                {
                    start: trimSeconds(val.start),
                    end: trimSeconds(val.end),
                },
            ];
            })
        );

        setShifts(formatted);
        }
        setLoading(false);
    }

    function openModal(date: Date) {
        const key = date.toISOString().split("T")[0];
        setSelectedDate(date);
        setStart(shifts[key]?.start ?? "");
        setEnd(shifts[key]?.end ?? "");
    }

    async function saveShift() {
        if (!selectedDate) return;

        const start = `${startHour}:${startMin}`;
        const end = `${endHour}:${endMin}`;

        const key = selectedDate.toISOString().split("T")[0];
        const startDate = new Date(`2000-01-01T${start}`);
        const endDate = new Date(`2000-01-01T${end}`);

        if (endDate <= startDate) {
            alert("終了時間は開始時間より後にしてください。");
            return;
        }

        setSaving(true);

        // ローカル更新
        setShifts((prev) => ({
        ...prev,
        [key]: { start, end },
        }));

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

        setSelectedDate(null);
    }

    async function deleteShift() {
        if (!selectedDate) return;
        setDeleting(true);

        const key = selectedDate.toISOString().split("T")[0];

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

        setShifts((prev) => {
            const copy = { ...prev };
            delete copy[key];
            return copy;
        });

        setDeleting(false);
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

                        return (
                            loading ||        // ← ロード中は無効
                            date < today      // ← 過去日は無効
                        );
                    }}
                    tileContent={({ date, view }) => {
                        if (view !== "month") return null;
                        if (loading) {
                            return <div style={{ height: "32px" }}></div>; // ← 空の高さだけ
                        }
                        const key = date.toISOString().split("T")[0];
                        const shift = shifts[key];
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

                        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                            <select value={startHour} onChange={(e) => setStartHour(e.target.value)}>
                                {Array.from({ length: 24 }).map((_, h) => {
                                    const hh = String(h).padStart(2, "0");
                                    return <option key={hh} value={hh}>{hh}</option>;
                                })}
                            </select>

                            <select value={startMin} onChange={(e) => setStartMin(e.target.value)}>
                                {["00", "15", "30", "45"].map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                            <select value={endHour} onChange={(e) => setEndHour(e.target.value)}>
                                {Array.from({ length: 24 }).map((_, h) => {
                                const hh = String(h).padStart(2, "0");
                                return <option key={hh} value={hh}>{hh}</option>;
                                })}
                            </select>

                            <select value={endMin} onChange={(e) => setEndMin(e.target.value)}>
                                {["00", "15", "30", "45"].map((m) => (
                                <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>

                        <button onClick={saveShift}>{saving ? "保存中..." : "保存"}</button>

                        <button
                            onClick={deleteShift}
                            style={{ marginLeft: 10, color: "red" }}
                        >
                            {deleting ? "削除中..." : "削除"}
                        </button>

                        <button onClick={() => setSelectedDate(null)} style={{ marginLeft: 10 }}>
                            キャンセル
                        </button>
                    </div>
                </div>
            )}
            
            </div>
        );
}   };
