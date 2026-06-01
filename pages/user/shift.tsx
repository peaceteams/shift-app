import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

// 秒を消す
function trimSeconds(time: string) {
  if (!time) return "";
  return time.slice(0, 5); // "20:00:00" → "20:00"
}

export default function ShiftSubmitPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [shifts, setShifts] = useState<Record<string, { start: string; end: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        const key = selectedDate.toISOString().split("T")[0];

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

        if (!res.ok) {
        alert(json.error ?? "保存に失敗しました");
        return;
        }

        setSelectedDate(null);
    }

    if (loading) {
        return (
            <div style={{ padding: 20 }}>

                <h1>シフト提出</h1>
                
                <div
                    style={{
                        fontSize: 12,
                        color: "#aaa",
                        height: "32px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: "14px",
                    }}
                >

                <>
                <span>–</span>
                <span>–</span>
                </>
                </div>
            </div>
        )
    }

    return (
        <div style={{ padding: 20 }}>

        <h1>シフト提出</h1>
        
        <Calendar
            onClickDay={(date) => {
                if (loading) return;
                openModal(date);
            }}
            
            tileDisabled={() => loading}
            
            tileContent={({ date }) => {
                const key = date.toISOString().split("T")[0];
                const shift = shifts[key];

                return (
                    <div
                    style={{
                        fontSize: 12,
                        color: shift ? "green" : "#aaa",
                        height: "32px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: "14px",
                    }}
                    >

                    {shift ? (
                        <>
                        <span>{shift!.start}</span>
                        <span>{shift!.end}</span>
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

                <div style={{ background: "white", padding: 20, borderRadius: 8 }}>
                    <h3>{selectedDate.toLocaleDateString()} のシフト</h3>

                    <input
                        type="time"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                        style={{ width: "100%", marginBottom: 10 }}
                    />

                    <input
                        type="time"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                        style={{ width: "100%", marginBottom: 10 }}
                    />

                    <button onClick={saveShift}>保存</button>
                    <button onClick={() => setSelectedDate(null)} style={{ marginLeft: 10 }}>
                        キャンセル
                    </button>
                </div>
            </div>
        )}
        
        </div>
    );
}
