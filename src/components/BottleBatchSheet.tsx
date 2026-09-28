"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { MoneyInput, Sheet } from "@/components/KuwaUI";
import { useToast } from "@/components/ui/Toast";
import { doneFeedback, tapFeedback } from "@/lib/haptics";
import { STAGE_LABELS, headCount } from "@/lib/breeding";
import {
  BatchForm,
  bottleTargets,
  buildBottleChanges,
  emptyBatchForm,
} from "@/lib/bottleBatch";

/**
 * まとめてビン交換。
 *
 * 日付・ビンの種類・容量・値段はどの子も同じで、**違うのは体重だけ**。
 * 上でまとめて決めて、体重だけ1頭ずつ入れる。
 */

const TYPES = ["菌糸ビン", "カワラ菌糸", "発酵マット", "プリンカップ"];
const SIZES = ["200cc", "500cc", "800cc", "1400cc", "2000cc", "3000cc"];

export function BottleBatchSheet({ onClose }: { onClose: () => void }) {
  const larvae = useKuwagataStore((s) => s.larvae);
  const schedule = useKuwagataStore((s) => s.schedule);
  const speciesTuning = useKuwagataStore((s) => s.speciesTuning);
  const addBottleChange = useKuwagataStore((s) => s.addBottleChange);
  const { showToast } = useToast();

  const targets = bottleTargets(larvae, schedule, speciesTuning);
  const [form, setForm] = useState<BatchForm>(emptyBatchForm);
  // はじめは「そろそろの子」だけ選んでおく。いちばん多い使い方なので
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(targets.filter((t) => t.due).map((t) => t.larva.id))
  );
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const set = (patch: Partial<BatchForm>) => setForm((f) => ({ ...f, ...patch }));
  const toggle = (id: string) => {
    tapFeedback();
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rows = targets.filter((t) => picked.has(t.larva.id));
  const heads = rows.reduce((sum, t) => sum + headCount(t.larva), 0);

  const submit = () => {
    if (rows.length === 0 || done) return;
    for (const { larvaId, change } of buildBottleChanges(
      rows.map((t) => ({ larva: t.larva, weightG: weights[t.larva.id] ?? "" })),
      form
    )) {
      addBottleChange(larvaId, change);
    }
    doneFeedback();
    setDone(true);
    showToast(`${rows.length}件のビン交換を記録しました`);
    setTimeout(() => onClose(), 800);
  };

  return (
    <Sheet title="まとめてビン交換" onClose={onClose}>
      {targets.length === 0 ? (
        <p className="text-sm leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
          いま交換できる子がいません。ビンを替えるのは、エサを食べている段階
          (初齢〜3齢) の子だけです。
        </p>
      ) : (
        <div className="space-y-4">
          <div className="kuwa-card p-4 space-y-3">
            <div className="flex flex-wrap gap-3 items-start">
              <div>
                <label className="block text-sm font-medium text-[#40352a] mb-1">交換日</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set({ date: e.target.value })}
                  className="kuwa-input kuwa-input-date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#40352a] mb-1">容量</label>
                <select
                  value={form.bottleSize}
                  onChange={(e) => set({ bottleSize: e.target.value })}
                  className="kuwa-input"
                  style={{ width: "7rem" }}
                >
                  {SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">ビンの種類</label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((x) => (
                  <button
                    key={x}
                    type="button"
                    onClick={() => set({ bottleType: x })}
                    data-on={form.bottleType === x}
                    className="kuwa-chip kuwa-chip-moss font-maru"
                    style={{ padding: "6px 13px", fontSize: 12 }}
                  >
                    {x}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">
                ビン1本の値段 (税込)
              </label>
              <MoneyInput
                value={form.costYen}
                onChange={(v) => set({ costYen: v })}
                placeholder="850 (入れなくても構いません)"
              />
              <p className="text-[11px] mt-1" style={{ color: "var(--kuwa-ink-soft)" }}>
                まとまりの記録には、頭数ぶんをかけて記録します
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">メモ</label>
              <input
                value={form.memo}
                onChange={(e) => set({ memo: e.target.value })}
                placeholder="任意。選んだ子ぜんぶに同じメモが入ります"
                className="kuwa-input"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-sm font-bold flex-1" style={{ color: "var(--kuwa-ink)" }}>
              交換する子 ({rows.length}件・{heads}頭)
            </p>
            <button
              onClick={() => setPicked(new Set(targets.map((t) => t.larva.id)))}
              className="kuwa-chip"
              style={{ padding: "4px 11px", fontSize: 11 }}
            >
              すべて
            </button>
            <button
              onClick={() => setPicked(new Set())}
              className="kuwa-chip"
              style={{ padding: "4px 11px", fontSize: 11 }}
            >
              なし
            </button>
          </div>

          <div className="space-y-2">
            {targets.map((t) => {
              const on = picked.has(t.larva.id);
              return (
                <div
                  key={t.larva.id}
                  className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
                  style={{
                    border: `1px solid ${on ? "var(--kuwa-moss)" : "var(--kuwa-line)"}`,
                    background: on ? "#fffdf6" : "transparent",
                  }}
                >
                  <button
                    onClick={() => toggle(t.larva.id)}
                    aria-pressed={on}
                    className="min-w-0 flex-1 text-left active:scale-[0.99] transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{
                          background: on ? "var(--kuwa-moss)" : "transparent",
                          border: on ? "none" : "1px solid var(--kuwa-line)",
                          color: "#fdf6e7",
                        }}
                      >
                        {on && <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.6} />}
                      </span>
                      <span className="min-w-0">
                        <span
                          className="text-sm font-bold block truncate"
                          style={{ color: "var(--kuwa-ink)" }}
                        >
                          {t.larva.code}
                          {headCount(t.larva) > 1 && (
                            <span className="text-[11px] font-semibold ml-1.5">
                              {headCount(t.larva)}頭
                            </span>
                          )}
                        </span>
                        <span
                          className="text-[11px] block"
                          style={{ color: t.due ? "var(--kuwa-amber)" : "var(--kuwa-ink-soft)" }}
                        >
                          {STAGE_LABELS[t.larva.stage]} ・{" "}
                          {t.days == null ? "まだ入れていません" : `前回から${t.days}日`}
                        </span>
                      </span>
                    </span>
                  </button>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    inputMode="decimal"
                    value={weights[t.larva.id] ?? ""}
                    onChange={(e) =>
                      setWeights((w) => ({ ...w, [t.larva.id]: e.target.value }))
                    }
                    placeholder="体重"
                    aria-label={`${t.larva.code} の体重 (g)`}
                    className="kuwa-input flex-shrink-0 text-center"
                    style={{ width: "5rem", padding: "8px 6px" }}
                  />
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={rows.length === 0 || done}
            className={`w-full font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-base min-h-[52px] ${
              done
                ? "bg-[#55682f] text-[#fdf6e7] animate-kuwa-pop"
                : rows.length === 0
                ? "bg-[#d8c9ae] text-[#8b7a64]"
                : "bg-[#55682f] text-[#fdf6e7] active:scale-[0.98]"
            }`}
          >
            {done ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                記録しました！
              </>
            ) : (
              `${rows.length}件ぶん記録する`
            )}
          </button>
        </div>
      )}
    </Sheet>
  );
}
