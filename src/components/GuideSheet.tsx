"use client";

import {
  CalendarCheck,
  DatabaseBackup,
  Heart,
  HelpCircle,
  LayoutGrid,
  Calculator,
  Lightbulb,
  Plus,
  Sprout,
  Trophy,
  UtensilsCrossed,
} from "lucide-react";
import { Accordion, Sheet } from "@/components/KuwaUI";
import { GUIDE_INTRO, GUIDE_SECTIONS, GuideBlock } from "@/lib/guide";
import { useKuwagataStore } from "@/store/kuwagataStore";

const ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  grid: LayoutGrid,
  plus: Plus,
  food: UtensilsCrossed,
  heart: Heart,
  sprout: Sprout,
  calendar: CalendarCheck,
  calc: Calculator,
  trophy: Trophy,
  backup: DatabaseBackup,
  help: HelpCircle,
};

function Block({ block, showCost }: { block: GuideBlock; showCost: boolean }) {
  if (block.kind === "text") {
    return (
      <p className="text-sm leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
        {block.text}
      </p>
    );
  }

  if (block.kind === "list") {
    return (
      <ul className="space-y-2">
        {block.items
          .filter((it) => !it.only || (it.only === "cost") === showCost)
          .map((it, i) => (
          <li key={i} className="text-sm leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
            {it.term && (
              <strong className="font-bold" style={{ color: "var(--kuwa-ink)" }}>
                {it.term}
                {" … "}
              </strong>
            )}
            {it.text}
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === "steps") {
    return (
      <ol className="space-y-3">
        {block.items.map((it, i) => (
          <li key={i} className="flex gap-3">
            <span
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5"
              style={{ background: "var(--kuwa-bark)", color: "#fdf6e7" }}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-maru text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
                {it.title}
              </p>
              <p className="text-sm leading-relaxed mt-0.5" style={{ color: "var(--kuwa-ink-soft)" }}>
                {it.text}
              </p>
            </div>
          </li>
        ))}
      </ol>
    );
  }

  // つまずきやすいところ。本文と地続きだと読み飛ばされるので囲む
  return (
    <div className="rounded-2xl px-3.5 py-3 flex gap-2.5" style={{ background: "var(--kuwa-amber-soft)" }}>
      <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={2.2} style={{ color: "var(--kuwa-amber)" }} />
      <p className="text-sm leading-relaxed" style={{ color: "#7a5a22" }}>
        {block.text}
      </p>
    </div>
  );
}

export function GuideSheet({ onClose }: { onClose: () => void }) {
  const showCost = useKuwagataStore((s) => s.reminder.showCost);

  return (
    <Sheet title="使い方" onClose={onClose}>
      <div className="space-y-3">
        <div className="rounded-2xl px-4 py-3.5" style={{ background: "var(--kuwa-bark-bg)" }}>
          <p className="text-sm leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
            {GUIDE_INTRO}
          </p>
        </div>

        {GUIDE_SECTIONS.filter((sec) => !sec.only || (sec.only === "cost") === showCost).map((sec, i) => {
          const Icon = ICONS[sec.icon] ?? HelpCircle;
          return (
            <Accordion
              key={sec.id}
              title={`${i + 1}. ${sec.title}`}
              lead={sec.lead}
              // 最初の1章だけ開いておく。全部閉じた状態で出すと、
              // 開けるものだと気づかれないまま閉じられてしまう
              defaultOpen={i === 0}
              icon={
                <span
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--kuwa-bark-bg)", color: "var(--kuwa-bark)" }}
                >
                  <Icon className="w-[17px] h-[17px]" strokeWidth={2.2} />
                </span>
              }
            >
              <div className="space-y-3.5">
                {sec.blocks
                  .filter((b) => !b.only || (b.only === "cost") === showCost)
                  .map((b, j) => (
                    <Block key={j} block={b} showCost={showCost} />
                  ))}
              </div>
            </Accordion>
          );
        })}

        <p className="text-xs leading-relaxed pt-1" style={{ color: "var(--kuwa-ink-soft)" }}>
          分からないことがあれば、まずこの画面に戻ってきてください。ヘッダーの「？」からいつでも開けます。
        </p>
      </div>
    </Sheet>
  );
}
