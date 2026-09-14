"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import {
  SpeciesTuning,
  TuningSource,
  husbandryOf,
  sourceOf,
  tuningFor,
} from "@/lib/speciesTuning";
import { useKuwagataStore } from "@/store/kuwagataStore";

/**
 * 品種ごとの目安。
 *
 * 手元にいる品種だけを並べる。飼っていない品種まで出すと、
 * 何を直せばよいのか分からなくなるため。
 */
const FIELDS: { key: keyof SpeciesTuning; label: string; unit: string }[] = [
  { key: "feedIntervalDays", label: "エサ替えの間隔", unit: "日おき" },
  { key: "pupaDaysMin", label: "蛹化から羽化まで (最短)", unit: "日" },
  { key: "pupaDaysMax", label: "蛹化から羽化まで (最長)", unit: "日" },
  { key: "digOutDays", label: "羽化から掘り出しまで", unit: "日" },
  { key: "bottleChangeDays", label: "ビン交換の間隔", unit: "日" },
];

function SourceTag({ source }: { source: TuningSource }) {
  if (source === "user") return null;
  if (source === "global") {
    return (
      <span className="text-[10px] flex-shrink-0" style={{ color: "var(--kuwa-ink-soft)" }}>
        全体
      </span>
    );
  }
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 flex-shrink-0"
      style={{ background: "rgba(107,68,35,0.1)", color: "var(--kuwa-bark)" }}
    >
      <Sparkles className="w-2.5 h-2.5" strokeWidth={2.6} />
      AI
    </span>
  );
}

function SpeciesRow({ species }: { species: string }) {
  const schedule = useKuwagataStore((s) => s.schedule);
  const reminder = useKuwagataStore((s) => s.reminder);
  const speciesTuning = useKuwagataStore((s) => s.speciesTuning);
  const setSpeciesTuning = useKuwagataStore((s) => s.setSpeciesTuning);
  const clearSpeciesTuning = useKuwagataStore((s) => s.clearSpeciesTuning);
  const [open, setOpen] = useState(false);

  const values = tuningFor(species, schedule, reminder.intervalDays, speciesTuning);
  const group = husbandryOf(species);
  const edited = speciesTuning[species] != null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--kuwa-line)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2.5 flex items-center gap-2 text-left"
        style={{ background: "#fffdf6" }}
      >
        <span className="min-w-0 flex-1">
          <span className="text-sm font-bold block truncate" style={{ color: "var(--kuwa-ink)" }}>
            {species}
          </span>
          <span
            className="text-[11px] block"
            style={{ color: "var(--kuwa-ink-soft)", fontVariantNumeric: "tabular-nums" }}
          >
            エサ {values.feedIntervalDays}日おき ・ 蛹 {values.pupaDaysMin}〜{values.pupaDaysMax}日 ・
            掘り出し {values.digOutDays}日
          </span>
        </span>
        {edited ? (
          <span className="text-[10px] flex-shrink-0" style={{ color: "var(--kuwa-ink-soft)" }}>
            直しずみ
          </span>
        ) : (
          <SourceTag source={group ? "ai" : "global"} />
        )}
        <ChevronDown
          className="w-4 h-4 flex-shrink-0 transition-transform"
          strokeWidth={2.2}
          style={{
            color: "var(--kuwa-ink-soft)",
            transform: open ? "rotate(180deg)" : undefined,
          }}
        />
      </button>

      {open && (
        <div className="px-3 py-3 space-y-3" style={{ borderTop: "1px solid var(--kuwa-line)" }}>
          {group && (
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
              {group.label}: {group.why}
            </p>
          )}

          {FIELDS.map(({ key, label, unit }) => (
            <div key={key} className="flex items-center gap-2">
              <label className="text-xs flex-1 min-w-0" style={{ color: "var(--kuwa-ink)" }}>
                {label}
              </label>
              <SourceTag source={sourceOf(species, key, speciesTuning)} />
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={values[key]}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (Number.isFinite(n) && n > 0) setSpeciesTuning(species, { [key]: n });
                }}
                className="kuwa-input flex-shrink-0 text-right"
                style={{ width: "4.5rem", fontVariantNumeric: "tabular-nums" }}
              />
              <span className="text-xs flex-shrink-0" style={{ color: "var(--kuwa-ink-soft)" }}>
                {unit}
              </span>
            </div>
          ))}

          {edited && (
            <button
              onClick={() => clearSpeciesTuning(species)}
              className="kuwa-btn-ghost w-full py-2.5 text-xs active:scale-[0.98] transition-all"
            >
              {group ? "AIの目安に戻す" : "全体の設定に戻す"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function SpeciesTuningSection() {
  const beetles = useKuwagataStore((s) => s.beetles);
  const larvae = useKuwagataStore((s) => s.larvae);

  // 手元にいる品種だけ。並び順は名前でそろえる
  const species = [...new Set([...beetles, ...larvae].map((x) => x.species))].sort((a, b) =>
    a.localeCompare(b, "ja")
  );
  if (species.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--kuwa-card)", border: "1px solid var(--kuwa-line)" }}
    >
      <p className="font-maru text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
        品種ごとの目安
      </p>
      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
        エサの減りかたも羽化までの日数も品種で違うので、上の全体設定より
        こちらが優先されます。個体ごとに決めた値があれば、さらにそちらが優先されます。
      </p>

      <div className="mt-3 space-y-2">
        {species.map((s) => (
          <SpeciesRow key={s} species={s} />
        ))}
      </div>

      <div
        className="rounded-xl px-3 py-2.5 mt-3 flex items-start gap-2"
        style={{ background: "var(--kuwa-bark-bg)", border: "1px solid var(--kuwa-line)" }}
      >
        <Sparkles
          className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
          strokeWidth={2.4}
          style={{ color: "var(--kuwa-bark)" }}
        />
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
          <strong style={{ color: "var(--kuwa-ink)" }}>AI</strong> の印は、飼育の
          一般的なやり方から AI が出した出発点という意味です。実際には品種よりも、
          温度と、菌糸かマットかのほうが効きます。ご自身のやり方に合わせて直してください。
        </p>
      </div>
    </div>
  );
}
