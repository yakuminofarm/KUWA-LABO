"use client";

import { DatePrecision } from "@/types";

interface DateFieldProps {
  label: string;
  /** YYYY-MM-DD。空文字は未入力 */
  value: string;
  /** "month" なら月までしか分かっていない。未設定は日まで正確 */
  precision?: DatePrecision;
  onChange: (value: string, precision?: DatePrecision) => void;
  required?: boolean;
  /** 空欄に戻せるようにする (任意項目のとき) */
  clearable?: boolean;
  hint?: string;
}

/** "2026-08" → "2026-08-01"。書式が違うものは弾く */
function monthToDate(month: string): string {
  return /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : "";
}

/**
 * 日付の入力欄。
 * 飼育では「6月ごろ入手」のように日まで思い出せないことが多い。
 * 適当な日を入れさせると、その日付で掘り出し予定まで計算してしまうので、
 * 「だいたい」を選べるようにして月までの記録だと分かる形で残す。
 */
export function DateField({
  label,
  value,
  precision,
  onChange,
  required,
  clearable,
  hint,
}: DateFieldProps) {
  const rough = precision === "month";

  return (
    // グリッドの中では既定で min-width:auto になり、日付欄の最小幅ぶん
    // 列が広がって隣にはみ出す。縮めるよう明示しておく
    <div style={{ minWidth: 0 }}>
      <div className="flex items-center gap-2 mb-1">
        <label className="block text-sm font-medium text-[#40352a] flex-1 min-w-0 truncate">
          {label}
          {required && " *"}
        </label>
        <button
          type="button"
          onClick={() =>
            // 月までに落とすときは、日を1日に丸めて表示と中身を合わせる
            rough
              ? onChange(value, undefined)
              : onChange(value ? `${value.slice(0, 7)}-01` : "", "month")
          }
          // 主役はあくまで日付欄なので、チップは小さめにして添え物に見せる
          className="kuwa-chip flex-shrink-0"
          style={{ padding: "4px 11px", fontSize: 11 }}
          data-on={rough}
        >
          だいたい
        </button>
      </div>
      <input
        type={rough ? "month" : "date"}
        value={rough ? value.slice(0, 7) : value}
        onChange={(e) =>
          onChange(rough ? monthToDate(e.target.value) : e.target.value, precision)
        }
        className="kuwa-input"
      />
      {/* 見出しの行に3つ並べると、狭い列では見出しが折り返して崩れる。
          消す操作は使う頻度が低いので下に置く */}
      {clearable && value && (
        <button
          type="button"
          onClick={() => onChange("", undefined)}
          className="text-[11px] font-semibold mt-1 underline underline-offset-2"
          style={{ color: "var(--kuwa-ink-soft)" }}
        >
          日付を消す
        </button>
      )}
      {hint && (
        <p className="text-[11px] mt-1" style={{ color: "var(--kuwa-ink-soft)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
