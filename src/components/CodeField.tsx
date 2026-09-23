"use client";

import { useState } from "react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import {
  SERIES_MAX,
  joinCode,
  knownSeries,
  nextNumberIn,
  seriesLabel,
  splitCode,
} from "@/lib/codeSeries";

/**
 * 管理番号の欄。系統と番号を分けて入れる。
 *
 * 系統 (25OK-A) は一度決めるとしばらく変わらないので選ぶだけにして、
 * 打つのは番号だけにする。系統を選び直すと、その系統の続きの番号に入れ替える。
 *
 * 記録に残るのは、これまでどおり「25OK-A3」という1つの文字。
 */

type Mode = "pick" | "new" | "free";

const NEW = "__new__";
const FREE = "__free__";

export function CodeField({
  value,
  onChange,
  hint,
  label = "管理番号",
}: {
  value: string;
  onChange: (code: string) => void;
  /** 欄の下に添える一言 (下書きの出どころなど) */
  hint?: React.ReactNode;
  label?: string;
}) {
  const beetles = useKuwagataStore((s) => s.beetles);
  const registered = useKuwagataStore((s) => s.codeSeries);
  const series = knownSeries(beetles, registered);

  const parts = splitCode(value);
  // 開いたときの番号は、直しに来た本人のもの。重なりの知らせから外す
  const [own] = useState(value);

  const [mode, setMode] = useState<Mode>(() => {
    if (value !== "" && !parts) return "free";
    // 一覧に無い系統 (新しく決めた系統や、まだ何も登録していないとき) は打つ欄で出す
    if (parts && !series.includes(parts.series)) return "new";
    return series.length > 0 ? "pick" : "new";
  });

  const set = (s: string, n: string) => onChange(joinCode(s, n));

  /** 系統を選び直したら、番号はその系統の続きにする */
  const pickSeries = (next: string) => {
    if (next === NEW) {
      setMode("new");
      set("", parts?.number ?? "1");
      return;
    }
    if (next === FREE) {
      setMode("free");
      return;
    }
    setMode("pick");
    set(next, nextNumberIn(next, beetles));
  };

  const taken =
    value !== "" && value !== own && beetles.some((b) => b.code === value);

  return (
    <div>
      <label className="block text-sm font-medium text-[#40352a] mb-1">{label} *</label>

      {mode === "free" ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="例: 26OK-A1"
          className="kuwa-input"
        />
      ) : (
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            {mode === "pick" ? (
              <select
                value={parts?.series ?? ""}
                onChange={(e) => pickSeries(e.target.value)}
                className="kuwa-input"
              >
                {series.map((s) => (
                  <option key={s} value={s}>
                    {seriesLabel(s)}
                  </option>
                ))}
                <option value={NEW}>＋ 新しい系統…</option>
                <option value={FREE}>自分で書く</option>
              </select>
            ) : (
              <input
                value={parts?.series ?? ""}
                onChange={(e) => set(e.target.value, parts?.number ?? "1")}
                placeholder="系統 (例: 26OK-A)"
                maxLength={SERIES_MAX}
                className="kuwa-input"
              />
            )}
          </div>
          <input
            value={parts?.number ?? ""}
            onChange={(e) =>
              // 番号は数字だけ。桁をそろえたい人のために 0 も落とさない
              set(parts?.series ?? "", e.target.value.replace(/[^0-9]/g, ""))
            }
            inputMode="numeric"
            placeholder="番号"
            className="kuwa-input flex-shrink-0 text-center"
            style={{ width: "5.5rem", fontVariantNumeric: "tabular-nums" }}
          />
        </div>
      )}

      {mode === "new" && series.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setMode("pick");
            set(series[0], nextNumberIn(series[0], beetles));
          }}
          className="text-[11px] mt-1 underline underline-offset-2"
          style={{ color: "var(--kuwa-ink-soft)" }}
        >
          いままでの系統から選ぶ
        </button>
      )}

      {mode !== "free" && value !== "" && (
        <p className="text-[11px] mt-1" style={{ color: "var(--kuwa-ink-soft)" }}>
          <strong style={{ color: "var(--kuwa-ink)" }}>{value}</strong> として記録します
        </p>
      )}

      {/* 重なりは止めない。直している途中や、付け替えの最中のことがある */}
      {taken && (
        <p className="text-[11px] mt-1 font-bold" style={{ color: "var(--kuwa-clay)" }}>
          この管理番号は、ほかの子で使われています
        </p>
      )}

      {hint}
    </div>
  );
}
