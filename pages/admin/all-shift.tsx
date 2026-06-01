"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function formatTime(t?: string) {
  if (!t) return "–";
  return t.slice(0, 5); // "HH:MM"
}

export default function AllShiftPage() {
    type User = {
    id: string;
    name: string;
    };

    type Shift = {
    user_id: string;
    date: string;
    start_time: string;
    end_time: string;
    };

    const [users, setUsers] = useState<User[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);

    useEffect(() => {
        load();
    }, []);

async function load() {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: shiftRequests } = await supabase.from("shift_requests").select("*");

    setUsers(profiles || []);
    setShifts(shiftRequests || []);
}

// 今月の日付一覧を作る
const today = new Date();
const year = today.getFullYear();
const month = today.getMonth();
const daysInMonth = new Date(year, month + 1, 0).getDate();

const dates = Array.from({ length: daysInMonth }).map((_, i) => {
    const d = new Date(year, month, i + 1);
    return d.toISOString().split("T")[0];
});

return (
    <div style={{ padding: 20 }}>
        <h1>全メンバーのシフト一覧</h1>

        <table border={1} cellPadding={6} style={{ marginTop: 20, borderCollapse: "collapse" }}>
            <thead>
                <tr>
                    <th>名前</th>
                    {dates.map((d) => (
                    <th key={d}>{d.slice(5)}</th>
                    ))}
                </tr>
            </thead>

            <tbody>
                {users.map((u) => (
                    <tr key={u.id}>
                    <td>{u.name}</td>

                    {dates.map((d) => {
                        const shift = shifts.find(
                        (s) => s.user_id === u.id && s.date === d
                        );

                        return (
                        <td 
                            key={d}
                            style={{
                                textAlign: "center",
                                width: 70,
                                minWidth: 70,
                                padding: 4
                            }}
                        >
                            <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}>
                                <span>{shift ? formatTime(shift.start_time) : "–"}</span>
                                <span>{shift ? formatTime(shift.end_time) : "–"}</span>
                            </div>
                        </td>
                        );
                    })}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);
}
