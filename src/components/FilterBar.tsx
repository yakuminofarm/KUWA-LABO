"use client";

import { Accordion } from "@/components/KuwaUI";
import { countText, summaryLine } from "@/lib/listFilter";

/**
 * 一覧の上の「しぼりこみ」。
 *
 * 絞り込みと並べ替えのチップは、ふだん触らないのに場所だけ取っていた。
 * 畳んで、閉じているあいだは「いま何頭出ていて、なぜその件数なのか」の
 * 1行だけにする。
 */
export function FilterBar({
  count,
  unit,
  conditions,
  view,
  onClear,
  children,
}: {
  count: number;
  /** 数える単位。頭・ライン */
  unit: string;
  /** いま効いている絞り込みの名前 */
  conditions: string[];
  /** 並べ方・見せ方。件数は変わらない */
  view?: string[];
  onClear: () => void;
  children: React.ReactNode;
}) {
  const on = conditions.length > 0;

  return (
    <Accordion
      title={countText(count, unit)}
      lead={summaryLine(conditions, view)}
      // 閉じていても、絞り込みが効いていることが色で分かるようにする。
      // 気づかないまま「登録したはずの子がいない」と探すことになるため
      mark={
        on ? (
          <span
            className="kuwa-badge font-maru flex-shrink-0"
            style={{ background: "var(--kuwa-bark)", color: "#fdf6e7" }}
          >
            {conditions.length}
          </span>
        ) : undefined
      }
    >
      <div className="space-y-2.5">
        {children}
        {on && (
          <button
            onClick={onClear}
            className="text-xs font-bold underline underline-offset-2 pt-0.5"
            style={{ color: "var(--kuwa-ink-soft)" }}
          >
            絞り込みをすべて外す
          </button>
        )}
      </div>
    </Accordion>
  );
}
