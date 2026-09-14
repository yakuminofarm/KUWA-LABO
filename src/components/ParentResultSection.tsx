"use client";

import { parentResult } from "@/lib/offspring";
import { Beetle, BreedingLine, Larva } from "@/types";

/**
 * 種親としての成績。
 *
 * 次に何を組むかを決めるとき、知りたいのは「この親から何頭採れて、
 * どこまで大きくなったか」。ライン名だけ並べても、そこまでは分からない。
 */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px]" style={{ color: "var(--kuwa-ink-soft)" }}>
        {label}
      </p>
      <p
        className="font-maru text-sm font-bold"
        style={{ color: "var(--kuwa-ink)", fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </p>
    </div>
  );
}

const heads = (n: number) => `${n}頭`;
const size = (mm?: number) => (mm == null ? "—" : `${mm}mm`);

export function ParentResultSection({
  beetle,
  lines,
  larvae,
  beetles,
}: {
  beetle: Beetle;
  lines: BreedingLine[];
  larvae: Larva[];
  beetles: Beetle[];
}) {
  const result = parentResult(beetle, lines, larvae, beetles);
  if (result.lines.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--kuwa-card)", border: "1px solid var(--kuwa-line)" }}
    >
      <p className="font-maru text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
        種親としての成績
      </p>

      <div className="grid grid-cols-4 gap-2 mt-2.5">
        <Stat label="ライン" value={`${result.lines.length}本`} />
        <Stat label="採れた" value={heads(result.larvaHeads)} />
        <Stat label="羽化" value={heads(result.emergedHeads)} />
        <Stat label="最大" value={size(result.bestSizeMm)} />
      </div>

      <div className="mt-3 space-y-1.5">
        {result.lines.map((r) => (
          <div
            key={r.line.id}
            className="rounded-xl px-3 py-2.5"
            style={{ background: "#fffdf6", border: "1px solid var(--kuwa-line)" }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-bold truncate" style={{ color: "var(--kuwa-ink)" }}>
                {r.line.name}
              </span>
              <span
                className="text-xs flex-shrink-0"
                style={{ color: "var(--kuwa-ink-soft)", fontVariantNumeric: "tabular-nums" }}
              >
                最大 {size(r.bestSizeMm)}
              </span>
            </div>
            <p
              className="text-[11px] mt-0.5"
              style={{ color: "var(--kuwa-ink-soft)", fontVariantNumeric: "tabular-nums" }}
            >
              採れた {heads(r.larvaHeads)} ・ 生存 {heads(r.aliveHeads)} ・ 羽化{" "}
              {heads(r.emergedHeads)}
            </p>
          </div>
        ))}
      </div>

      <p className="text-[11px] mt-2.5 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
        まとまりで登録した幼虫は、頭数ぶん数えています。
      </p>
    </div>
  );
}
