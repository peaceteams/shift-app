"use client";

import { useEffect, useState } from "react";
import { GetServerSidePropsContext } from "next";
import { requireAdmin } from "@/lib/auth/page/adminAuth";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
    const auth = await requireAdmin(ctx);

    if (!auth.ok) {
        return auth.redirect;
    }

    return {
        props: {
            admin: auth.user,
        },
    };
};

function formatTime(t?: string) {
    if (!t) return "–";
    return t.slice(0, 5);
}

export default function AllShiftPage() {
    type User = {
        id: string;
        user_id: string;
        name: string;
    };

    type Shift = {
        user_id: string;
        date: string;
        start_time: string;
        end_time: string;
        is_confirmed: boolean;
        is_holiday: boolean;
    };

    const [users, setUsers] = useState<User[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        async function run() {
            await load();
            adjustScale();
        }

        run();

        let es: EventSource | null = null;

        function connect() {
            // 既存接続が残っていたら確実に閉じる
            if (es) {
                console.log("[SSE] closing old connection");
                es.close();
            }

            console.log("[SSE] connecting...");
            es = new EventSource("/api/shift/stream");

            es.onopen = () => {
                console.log("[SSE] connection opened");
            };

            es.onmessage = (event) => {
                console.log("[SSE] raw:", event.data);

                let data;
                try {
                    data = JSON.parse(event.data);
                } catch {
                    console.log("[SSE] JSON parse error");
                    return;
                }

                // ping は無視
                if (data.type === "ping") return;

                if (data.type === "connected") {
                    console.log("[SSE] connected message received");
                    return;
                }

                if (data.type === "shift_updated") {
                    console.log("[SSE] shift_updated received → run()");
                    run();
                }
            };

            es.onerror = (err) => {
                console.log("[SSE] error:", err);
                console.log("[SSE] reconnecting in 1s...");
                es?.close();
                setTimeout(connect, 1000);
            };
        }

        // 初回接続
        connect();

        window.addEventListener("resize", adjustScale);

        return () => {
            console.log("[SSE] cleanup: closing connection");
            es?.close();
            window.removeEventListener("resize", adjustScale);
        };
    }, [startDate, endDate]);


    async function load() {
        const res = await fetch("/api/admin/list", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                startDate,
                endDate,
            }),
        });

        if (!res.ok) {
            console.error("Failed to load shifts");
            return;
        }

        const { profiles, shifts } = await res.json();

        const sorted = (profiles as User[]).sort(
            (a: User, b: User) => Number(a.user_id) - Number(b.user_id)
        );

        setUsers(sorted);
        setShifts(shifts as Shift[]);
    }

    // 日付一覧を作る
    const today = new Date();

    // startDate と endDate が指定されている場合はそれを使う
    const start = startDate
    ? new Date(startDate + "T00:00:00")
    : new Date(today.getFullYear(), today.getMonth(), 1);

    const end = endDate
    ? new Date(endDate + "T00:00:00")
    : new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // start〜end の全日付を生成
    const dates: string[] = [];
    let d = new Date(start);

    while (d <= end) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");

        dates.push(`${yyyy}-${mm}-${dd}`);

        d.setDate(d.getDate() + 1);
    }

    function adjustScale() {
        const wrapper = document.getElementById("table-wrapper");
        const scaleBox = document.getElementById("table-scale");

        if (!wrapper || !scaleBox) return;

        const wrapperWidth = wrapper.clientWidth;
        const tableWidth = scaleBox.scrollWidth;

        const scale = Math.min(1, wrapperWidth / tableWidth);

        scaleBox.style.transform = `scale(${scale})`;
    }

    async function confirmUserPeriod(userId: string) {
        if (!startDate || !endDate) {
            alert("期間を指定してください");
            return;
        }

        const res = await fetch("/api/shift/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: userId,
                start: startDate,
                end: endDate,
            }),
        });

        if (!res.ok) {
            alert("確定に失敗しました");
            return;
        }

        alert("確定しました");
        load();
    }

    async function unconfirmUserPeriod(userId: string) {
        if (!startDate || !endDate) {
            alert("期間を指定してください");
            return;
        }

        const res = await fetch("/api/shift/unconfirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: userId,
                start: startDate,
                end: endDate,
            }),
        });

        if (!res.ok) {
            alert("解除に失敗しました");
            return;
        }

        alert("確定解除しました");
        load();
    }

    return (
        <div style={{ padding: 20 }}>
            <h1>全メンバーのシフト一覧</h1>

            <div style={{ marginTop: 20, marginBottom: 20 }}>
                <label>開始日：</label>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                />

                <span style={{ margin: "0 10px" }}>〜</span>

                <label>終了日：</label>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                />
            </div>

            <div
                id="table-wrapper"
                style={{
                    width: "100%",
                    overflowX: "hidden",
                    overflowY: "auto",
                    maxHeight: "80vh", 
                }}>

                <div
                    id="table-scale"
                    style={{
                        transformOrigin: "top left",
                        display: "inline-block",
                    }}
                >
                    
                    <table border={1} cellPadding={6} style={{ marginTop: 20, borderCollapse: "collapse", tableLayout: "fixed", width: "100%", }}>
                        <colgroup>
                            <col style={{ width: "100px" }} />  {/* 名前 */}
                            <col style={{ width: "100px" }} />   {/* ユーザーID */}
                            <col style={{ width: "150px" }} />   {/* 確定・解除ボタン */}
                            {dates.map(() => (
                                <col key={crypto.randomUUID()} style={{ width: "100px" }} />  // 日付列
                            ))}
                        </colgroup>
                        <thead>
                            <tr>
                                <th>名前</th>
                                <th>ユーザーID（番号）</th>
                                <th>確定・解除ボタン</th>
                                {dates.map((d) => (
                                    <th key={d}>{d.slice(5)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id}>
                                <td style={{ textAlign: "center", padding: 4 }}>{u.name}</td>
                                <td style={{ textAlign: "center", padding: 4 }}>{u.user_id}</td>
                                <td style={{ textAlign: "center" }}>
                                    <button
                                        onClick={() => confirmUserPeriod(u.id)}
                                        style={{
                                            marginRight: 6,
                                            padding: "4px 8px",
                                            background: "#0070f3",
                                            color: "white",
                                            borderRadius: 4,
                                        }}
                                    >
                                        確定
                                    </button>

                                    <button
                                        onClick={() => unconfirmUserPeriod(u.id)}
                                        style={{
                                            padding: "4px 8px",
                                            background: "red",
                                            color: "white",
                                            borderRadius: 4,
                                        }}
                                    >
                                        解除
                                    </button>
                                </td>

                                {dates.map((d) => {
                                    const shift = shifts.find(
                                        (s) => s.user_id === u.id && s.date === d
                                    );
                                    return (
                                    <td
                                        key={d}
                                        style={{
                                            textAlign: "center",
                                            padding: 4,
                                            background: shift?.is_confirmed ? "#d0e7ff" : "white"
                                        }}
                                    >
                                        <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}>
                                            {shift ? (
                                                shift.is_holiday ? (
                                                    <div style={{ color: "red", fontWeight: "bold" }}>休み希望</div>
                                                ) : (
                                                    <>
                                                        <span>{formatTime(shift.start_time)}</span>
                                                        <span>{formatTime(shift.end_time)}</span>
                                                    </>
                                                )
                                            ) : (
                                                <>
                                                    <span>–</span>
                                                    <span>–</span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    );
                                })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <a
                href="./dashboard"
                style={{
                    position: "fixed",
                    top: "20px",
                    right: "20px",
                    background: "#0070f3",
                    color: "white",
                    padding: "12px 18px",
                    borderRadius: "8px",
                    textDecoration: "none",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                    fontWeight: "bold",
                    zIndex: 9999,
                }}
            >
                ダッシュボードへ戻る
            </a>
        </div>
    );
}