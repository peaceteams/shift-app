import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function ShiftSubmitPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [shifts, setShifts] = useState<Record<string, { start: string; end: string }>>({});

  function openModal(date: Date) {
    const key = date.toISOString().split("T")[0];
    setSelectedDate(date);
    setStart(shifts[key]?.start ?? "");
    setEnd(shifts[key]?.end ?? "");
  }

  function saveShift() {
    if (!selectedDate) return;
    const key = selectedDate.toISOString().split("T")[0];

    setShifts((prev) => ({
      ...prev,
      [key]: { start, end },
    }));

    setSelectedDate(null);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>シフト提出</h1>

      <Calendar
        onClickDay={(date) => openModal(date)}
        tileContent={({ date }) => {
          const key = date.toISOString().split("T")[0];
          if (shifts[key]) {
            return (
              <div style={{ fontSize: 12, color: "green" }}>
                {shifts[key].start} - {shifts[key].end}
              </div>
            );
          }
          return null;
        }}
      />

      {selectedDate && (
        <div style={{
          position: "fixed",
          top: 0, left: 0,
          width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.5)",
          display: "flex", justifyContent: "center", alignItems: "center"
        }}>
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
