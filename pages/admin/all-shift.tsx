"use client";

import { useEffect, useState } from "react";
import { GetServerSidePropsContext } from "next";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/adminAuth";

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function formatTime(t?: string) {
  if (!t) return "–";
  return t.slice(0, 5); // "HH:MM"
}

function addOneDay(dateStr: string) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AllShiftPage() {
    type User = {
        id: string;
        userId: string;
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

        const channel = supabase
            .channel("shift-rt")
            .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "shift_requests" },
            () => {
                load();
            }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

async function load() {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: shiftRequests } = await supabase.from("shift_requests").select("*");
    const sorted = (profiles || []).sort((a, b) => Number(a.userId) - Number(b.userId));
    
    setUsers(sorted);
    setShifts(shiftRequests || []);
}

// 今月1日〜2か月後の月末までの日付一覧を作る
const today = new Date();

// 今月の1日
const start = new Date(today.getFullYear(), today.getMonth(), 1);

// 2か月後の月末（month + 3 の day=0 → 2か月後の末日）
const end = new Date(today.getFullYear(), today.getMonth() + 3, 0);

// start〜end の全日付を生成
const dates: string[] = [];
let d = new Date(start);

while (d <= end) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    dates.push(`${yyyy}-${mm}-${dd}`); // ← これで絶対にズレない

    d.setDate(d.getDate() + 1);
}

return (
    <div style={{ padding: 20 }}>
        <h1>全メンバーのシフト一覧</h1>

        <table border={1} cellPadding={6} style={{ marginTop: 20, borderCollapse: "collapse" }}>
            <thead>
                <tr>
                    <th>名前</th>
                    <th>ユーザーID（番号）</th>
                    {dates.map((d) => (
                        <th key={d}>{d.slice(5)}</th>
                    ))}
                </tr>
            </thead>

            <tbody>
                {users.map((u) => (
                    <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.userId}</td>

                    {dates.map((d) => {
                        const shift = shifts.find(
                            (s) => s.user_id === u.id && addOneDay(s.date) === d
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

        <a
            href="./dashboard"
            style={{
                position: "fixed",
                bottom: "20px",
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
