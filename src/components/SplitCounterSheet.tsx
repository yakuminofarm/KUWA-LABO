"use client";

import { useState } from "react";
import { Minus, Shovel } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { BreedingLine } from "@/types";
import { Sheet } from "@/components/KuwaUI";
import { useToast } from "@/components/ui/Toast";
import { todayStr } from "@/lib/breeding";
import { doneFeedback, tapFeedback, undoFeedback } from "@/lib/haptics";
import {
  SPLIT_STAGES,
  SplitStage,
  SplitTally,
  buildSplitLarvae,
  bump,
  clearDraft,
  emptyTally,
  loadDraft,
  saveDraft,
  tallyLarvae,
  tallyTotal,
} from "@/lib/splitCount";

/**
 * 割り出しのカウンター。
 *
 * 土まみれの指で、見ないでも押せることを最優先にしてある。
 * 段階ごとの枠いっぱいが「1つ足す」の的で、戻す小さなボタンだけ右端に分けた
 * (戻すほうを同じ大きさにすると、数えている途中で押し間違える)。
 */
export function SplitCounterSheet({
  line,
  onClose,
}: {
  line: BreedingLine;
  onClose: () => void;
}) {
  const { larvae, addLarva, updateLine } = useKuwagataStore();
  const { showToast } = useToast();
  // 掘っている途中で画面が消えたり、アプリが後ろへ回されたりする。
  // 数え直しにならないよう、前回の続きがあれば最初から入れておく
  // (この画面はラインごとに開き直されるので、1回読めば足りる)
  const [draft] = useState(() => loadDraft(line.id));
  const [tally, setTally] = useState<SplitTally>(() => draft?.tally ?? emptyTally());
  const [date, setDate] = useState(() => draft?.date ?? todayStr());
  const [restored, setRestored] = useState(draft != null);
  const [saving, setSaving] = useState(false);

  const total = tallyTotal(tally);
  const larvaHeads = tallyLarvae(tally);

  const count = (stage: SplitStage, by: number) => {
    const next = bump(tally, stage, by);
    // もう0のところで戻しても数は変わらない。手ごたえも返さない
    // (返すと「戻せた」と思ってしまう)
    if (next[stage] !== tally[stage]) {
      if (by > 0) tapFeedback();
      else undoFeedback();
    }
    setTally(next);
    if (tallyTotal(next) > 0) saveDraft({ lineId: line.id, tally: next, date });
    else clearDraft();
  };

  const record = () => {
    if (total === 0 || saving) return;
    setSaving(true);
    const made = buildSplitLarvae(line, tally, date, larvae);
    for (const l of made) addLarva(l);
    updateLine(line.id, {
      status: "split_done",
      splitDate: date,
      larvaCount: larvaHeads || undefined,
      eggCount: tally.egg || undefined,
    });
    clearDraft();
    doneFeedback();
    showToast(`割り出しを記録しました (${made.length}件を作成)`);
    onClose();
  };

  const discard = () => {
    clearDraft();
    setTally(emptyTally());
    setRestored(false);
  };

  return (
    <Sheet title="割り出しカウンター" onClose={onClose}>
      <p className="text-xs" style={{ color: "var(--kuwa-ink-soft)" }}>
        {line.name} ・ {line.species}
      </p>

      {restored && total > 0 && (
        <div
          className="rounded-xl px-3.5 py-3 flex items-start justify-between gap-3"
          style={{ background: "var(--kuwa-amber-soft)", border: "1px solid rgba(163,102,15,0.3)" }}
        >
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--kuwa-ink)" }}>
            前に数えかけた続きから出しています ({total}件)。
            別の割り出しなら、数を0に戻してください。
          </p>
          <button
            onClick={discard}
            className="text-xs font-bold flex-shrink-0 py-1"
            style={{ color: "var(--kuwa-clay)" }}
          >
            0に戻す
          </button>
        </div>
      )}

      <div className="space-y-2.5">
        {SPLIT_STAGES.map(({ stage, label, unit }) => (
          <div key={stage} className="flex items-stretch gap-2">
            <button
              onClick={() => count(stage, 1)}
              aria-label={`${label}を1つ足す`}
              className="flex-1 rounded-2xl px-5 py-4 flex items-center justify-between active:scale-[0.98] transition-all"
              style={{
                background: tally[stage] > 0 ? "var(--kuwa-bark-bg)" : "var(--kuwa-card)",
                border: `1px solid ${tally[stage] > 0 ? "var(--kuwa-bark)" : "var(--kuwa-line)"}`,
                minHeight: 76,
              }}
            >
              <span className="font-maru text-base font-bold" style={{ color: "var(--kuwa-ink)" }}>
                {label}
              </span>
              <span className="flex items-baseline gap-1">
                <span
                  className="text-3xl font-bold"
                  style={{ color: "var(--kuwa-ink)", fontVariantNumeric: "tabular-nums" }}
                >
                  {tally[stage]}
                </span>
                <span className="text-xs" style={{ color: "var(--kuwa-ink-soft)" }}>
                  {unit}
                </span>
              </span>
            </button>
            <button
              onClick={() => count(stage, -1)}
              disabled={tally[stage] === 0}
              aria-label={`${label}を1つ戻す`}
              className="w-14 rounded-2xl flex items-center justify-center flex-shrink-0 active:scale-90 transition-all disabled:opacity-30"
              style={{
                background: "var(--kuwa-card)",
                border: "1px solid var(--kuwa-line)",
                color: "var(--kuwa-ink-soft)",
              }}
            >
              <Minus className="w-5 h-5" strokeWidth={2.6} />
            </button>
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl px-4 py-3 flex items-center justify-between"
        style={{ background: "var(--kuwa-bark-bg)" }}
      >
        <span className="text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
          合計
        </span>
        <span className="text-sm" style={{ color: "var(--kuwa-ink)" }}>
          卵 {tally.egg}個 ・ 幼虫 {larvaHeads}頭
        </span>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: "var(--kuwa-ink)" }}>
          割り出し日
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            if (total > 0) saveDraft({ lineId: line.id, tally, date: e.target.value });
          }}
          className="kuwa-input"
        />
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
        記録すると、数えたぶんの幼虫データが {line.name}-01 のように作られ、
        ラインが「割り出し済み」になります。卵はまだ孵化していないので、
        孵化日は入りません。押した数はその場で端末に残るので、
        途中で画面が消えても数え直しになりません。
      </p>

      <button
        onClick={record}
        disabled={total === 0 || saving}
        className="kuwa-btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-40"
      >
        <Shovel className="w-4 h-4" strokeWidth={2.4} />
        {total === 0 ? "数えてから記録できます" : `記録する (${total}件)`}
      </button>
    </Sheet>
  );
}
