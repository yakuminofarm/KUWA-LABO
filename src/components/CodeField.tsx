"use client";

import { useState } from "react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import {
  SERIES_MAX,
  codeFromParts,
  knownSeries,
  nextNumberIn,
  numberOptions,
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
  const seriesList = knownSeries(beetles, registered);

  const parts = splitCode(value);
  // 開いたときの番号は、直しに来た本人のもの。重なりの知らせから外す
  const [own] = useState(value);

  /**
   * 番号を消しているあいだ、系統は管理番号から読み取れない
   * (「TD-」は系統と番号に分けられない)。覚えておいて、そのまま出す。
   */
  const [heldSeries, setHeldSeries] = useState(() => parts?.series ?? "");
  const series = parts?.series ?? heldSeries;
  const number = parts?.number ?? "";
  // 直しに来た本人の番号。同じ系統のままなら、埋まっていても選べる
  const ownParts = splitCode(own);
  const numbers = numberOptions(
    series,
    beetles,
    ownParts?.series === series ? ownParts.number : undefined
  );

  const [mode, setMode] = useState<Mode>(() => {
    if (value !== "" && !parts) return "free";
    // 一覧に無い系統 (新しく決めた系統や、まだ何も登録していないとき) は打つ欄で出す
    if (parts && !seriesList.includes(parts.series)) return "new";
    return seriesList.length > 0 ? "pick" : "new";
  });

  const set = (s: string, n: string) => {
    setHeldSeries(s);
    onChange(codeFromParts(s, n));
  };

  /**
   * その系統で使う番号。続きが空いていればその続き、
   * 埋まっていれば空いている最初のもの。選べない番号を持ち回らないようにする
   */
  const numberFor = (s: string): string => {
    const opts = numberOptions(s, beetles);
    const next = nextNumberIn(s, beetles);
    return opts.includes(next) ? next : opts[0] ?? "1";
  };

  /** 系統を選び直したら、番号はその系統の続きにする */
  const pickSeries = (next: string) => {
    if (next === NEW) {
      setMode("new");
      set("", numberFor(""));
      return;
    }
    if (next === FREE) {
      setMode("free");
      return;
    }
    setMode("pick");
    set(next, numberFor(next));
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
                value={series}
                onChange={(e) => pickSeries(e.target.value)}
                className="kuwa-input"
              >
                {seriesList.map((s) => (
                  <option key={s} value={s}>
                    {seriesLabel(s)}
                  </option>
                ))}
                <option value={NEW}>＋ 新しい系統…</option>
                <option value={FREE}>自分で書く</option>
              </select>
            ) : (
              <input
                value={series}
                onChange={(e) => {
                  // 打ち終わった系統でその番号が埋まっていたら、空いている番号に移す
                  const s = e.target.value;
                  const opts = numberOptions(s, beetles);
                  set(s, opts.includes(number) ? number : numberFor(s));
                }}
                placeholder="系統 (例: 26OK-A)"
                maxLength={SERIES_MAX}
                className="kuwa-input"
              />
            )}
          </div>
          {/* 番号は選ぶだけにする。埋まっている番号は並ばないので、
              同じ管理番号を2つ作ってしまうことがない */}
          <select
            value={number}
            onChange={(e) => set(series, e.target.value)}
            aria-label="番号"
            className="kuwa-input flex-shrink-0"
            style={{ width: "6rem", fontVariantNumeric: "tabular-nums" }}
          >
            {number === "" && <option value="">番号</option>}
            {numbers.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === "new" && seriesList.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setMode("pick");
            set(seriesList[0], numberFor(seriesList[0]));
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

      {mode !== "free" && value === "" && series !== "" && (
        <p className="text-[11px] mt-1" style={{ color: "var(--kuwa-ink-soft)" }}>
          番号を入れてください
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
