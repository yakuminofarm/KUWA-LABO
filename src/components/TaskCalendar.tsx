"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UpcomingTask } from "@/lib/breeding";
import { todayStr } from "@/lib/breeding";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

/** その月のマス目。前後の空きも含めて7の倍数にそろえる */
function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= days; d++) {
    cells.push(
      `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const KIND_COLOR: Record<UpcomingTask["kind"], string> = {
  bottle: "var(--kuwa-moss)",
  split: "var(--kuwa-bark)",
  set: "var(--kuwa-bark)",
  emerge: "var(--kuwa-amber)",
  digout: "var(--kuwa-clay)",
};

export function TaskCalendar({ byDate }: { byDate: Map<string, UpcomingTask[]> }) {
  const today = todayStr();
  const now = new Date(today);
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [picked, setPicked] = useState<string | null>(today);

  const cells = monthGrid(cursor.y, cursor.m);
  const shift = (n: number) => {
    const d = new Date(cursor.y, cursor.m + n, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    setPicked(null);
  };

  const pickedTasks = picked ? byDate.get(picked) ?? [] : [];

  return (
    <div className="kuwa-card p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => shift(-1)} aria-label="前の月" className="p-2 active:scale-90 transition-all">
          <ChevronLeft className="w-5 h-5" style={{ color: "var(--kuwa-bark)" }} strokeWidth={2.2} />
        </button>
        <p className="font-maru text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
          {cursor.y}年 {cursor.m + 1}月
        </p>
        <button onClick={() => shift(1)} aria-label="次の月" className="p-2 active:scale-90 transition-all">
          <ChevronRight className="w-5 h-5" style={{ color: "var(--kuwa-bark)" }} strokeWidth={2.2} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEK.map((w, i) => (
          <div
            key={w}
            className="text-center text-[11px] font-bold py-1"
            style={{ color: i === 0 ? "#a3502f" : i === 6 ? "#4a6b86" : "var(--kuwa-ink-soft)" }}
          >
            {w}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} />;
          const tasks = byDate.get(date) ?? [];
          const isToday = date === today;
          const isPicked = date === picked;
          const day = Number(date.slice(8));
          return (
            <button
              key={date}
              onClick={() => setPicked(isPicked ? null : date)}
              className="aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90"
              style={{
                background: isPicked
                  ? "var(--kuwa-bark)"
                  : isToday
                  ? "var(--kuwa-bark-bg)"
                  : "transparent",
                border: isToday && !isPicked ? "1px solid var(--kuwa-bark)" : "1px solid transparent",
              }}
            >
              <span
                className="text-xs font-semibold"
                style={{
                  color: isPicked
                    ? "#fdf6e7"
                    : i % 7 === 0
                    ? "#a3502f"
                    : i % 7 === 6
                    ? "#4a6b86"
                    : "var(--kuwa-ink)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {day}
              </span>
              {/* 作業のある日に点を打つ。何の作業かは色で分かる */}
              <span className="flex gap-[2px] h-[5px] items-center">
                {tasks.slice(0, 3).map((t) => (
                  <span
                    key={t.id}
                    className="w-[5px] h-[5px] rounded-full"
                    style={{ background: isPicked ? "#fdf6e7" : KIND_COLOR[t.kind] }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {picked && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--kuwa-line)" }}>
          <p className="text-xs font-bold mb-2" style={{ color: "var(--kuwa-ink)" }}>
            {Number(picked.slice(5, 7))}月{Number(picked.slice(8))}日
          </p>
          {pickedTasks.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--kuwa-ink-soft)" }}>
              予定はありません
            </p>
          ) : (
            <div className="space-y-2">
              {pickedTasks.map((t) => (
                <div key={t.id} className="flex items-start gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                    style={{ background: KIND_COLOR[t.kind] }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--kuwa-ink)" }}>
                      {t.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--kuwa-ink-soft)" }}>
                      {t.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
