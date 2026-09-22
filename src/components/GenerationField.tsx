"use client";

import { useState } from "react";
import {
  GenKind,
  formatGeneration,
  generationNumbers,
  hasNumber,
  parseGeneration,
} from "@/lib/generation";

/**
 * 累代を選んで決める欄。
 *
 * 「WD かどうか」「何代目か」は別の話なので、区分と代数を分けて選ばせる。
 * 1つの欄に "CBF2" と打たせると、書き方のゆれがそのまま記録に残る。
 */

const KINDS: { kind: GenKind; label: string; hint: string }[] = [
  { kind: "wd", label: "WD 野外採集", hint: "山や林で採ってきた個体そのもの。" },
  { kind: "wf", label: "WF 野外の子", hint: "採ってきた個体から数えて何代目か。WF1 は WD の子。" },
  {
    kind: "cb",
    label: "CB 累代",
    hint: "飼育している親どうしから採れた個体。何代目か数えていなければ「わからない」を選ぶと、お店のラベルと同じ「CB」で残ります。",
  },
  { kind: "f", label: "F 代数のみ", hint: "WD 由来かどうかを分けず、代数だけで書く流儀。" },
  { kind: "unknown", label: "不明", hint: "分からないときはこのまま。累代の欄は空で記録します。" },
  { kind: "free", label: "自分で書く", hint: "打ったとおりに記録します。" },
];

export function GenerationField({
  value,
  onChange,
  label = "累代",
  /** 置く画面に合わせて見出しの大きさを変える */
  labelClass = "text-sm font-medium text-[#40352a]",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  labelClass?: string;
}) {
  const parsed = parseGeneration(value);
  // 「自分で書く」を選んだ直後は中身が空になり、読み直すと不明に戻ってしまう。
  // 選んだことだけは覚えておく
  const [freeOpen, setFreeOpen] = useState(() => parsed.kind === "free");
  const kind: GenKind = freeOpen ? "free" : parsed.kind;
  const n = parsed.n ?? 1;
  /**
   * 代数を「わからない」にできるか。
   * CB は、お店のラベルに「CB」とだけ刷られていることが実際にあり、
   * 何代目かを数えていないという意味を持つ。ほかの区分では、いまの記録が
   * すでにその書き方のときだけ選べるようにして、選択肢を増やさない。
   */
  const allowNoNumber = kind === "cb" || parsed.n == null;

  const pick = (next: GenKind) => {
    setFreeOpen(next === "free");
    // 自分で書くに移るときは、いま出ている文字をそのまま渡して続きから直せるように
    onChange(next === "free" ? formatGeneration(parsed) : formatGeneration({ kind: next, n }));
  };

  const current = KINDS.find((k) => k.kind === kind);
  const shown = formatGeneration(parsed);

  return (
    <div>
      <label className={`block mb-1 ${labelClass}`}>{label}</label>

      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            type="button"
            onClick={() => pick(k.kind)}
            data-on={kind === k.kind}
            className="kuwa-chip font-maru"
            style={{ padding: "7px 13px", fontSize: 12 }}
          >
            {k.label}
          </button>
        ))}
      </div>

      {hasNumber(kind) && (
        <div className="flex items-center gap-2 mt-2.5">
          <span className="text-sm flex-shrink-0" style={{ color: "var(--kuwa-ink)" }}>
            何代目
          </span>
          <select
            value={parsed.n ?? ""}
            onChange={(e) =>
              onChange(
                formatGeneration({
                  kind,
                  n: e.target.value === "" ? undefined : parseInt(e.target.value, 10),
                })
              )
            }
            className="kuwa-input"
            style={{ width: "7rem" }}
          >
            {allowNoNumber && <option value="">わからない</option>}
            {generationNumbers(parsed.n).map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
      )}

      {kind === "free" && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="例: CBF2 / WD"
          className="kuwa-input mt-2.5"
        />
      )}

      <p className="text-[11px] leading-relaxed mt-1.5" style={{ color: "var(--kuwa-ink-soft)" }}>
        {current?.hint}
        {shown && kind !== "free" && `「${shown}」として記録します。`}
      </p>
    </div>
  );
}
