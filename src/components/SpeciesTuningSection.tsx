"use client";

import { useState } from "react";
import { ChevronDown, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  SpeciesTuning,
  TuningSource,
  husbandryOf,
  sourceOf,
  tuningFor,
} from "@/lib/speciesTuning";
import { useKuwagataStore } from "@/store/kuwagataStore";
import {
  SPECIES_NAME_MAX,
  checkSpeciesName,
  speciesInUse,
  tuningTargets,
} from "@/lib/customSpecies";
import { useToast } from "@/components/ui/Toast";

/**
 * 品種ごとの目安。
 *
 * 並ぶのは **手元にいる品種と、自分で足した品種**。組み込みの一覧を全部出すと、
 * 何を直せばよいのか分からなくなる。
 *
 * 足した品種は記録が1件も無くても並ぶ (迎える前に目安を決めておけるように)。
 * 足した名前は登録画面の選択肢にも出るので、毎回「その他」で打たずに済む。
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

function SpeciesRow({
  species,
  onRemove,
}: {
  species: string;
  /** 自分で足した品種で、まだ記録が無いときだけ渡される */
  onRemove?: () => void;
}) {
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

          {onRemove && (
            <button
              onClick={onRemove}
              className="w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
              style={{ color: "var(--kuwa-clay)" }}
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
              この品種を一覧から外す
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const ISSUE_TEXT = {
  empty: "品種名を入れてください",
  "too-long": `品種名は${SPECIES_NAME_MAX}文字までにしてください`,
  duplicate: "その品種はもう選べます",
} as const;

export function SpeciesTuningSection() {
  const beetles = useKuwagataStore((s) => s.beetles);
  const larvae = useKuwagataStore((s) => s.larvae);
  const customSpecies = useKuwagataStore((s) => s.customSpecies);
  const addCustomSpecies = useKuwagataStore((s) => s.addCustomSpecies);
  const removeCustomSpecies = useKuwagataStore((s) => s.removeCustomSpecies);
  const { showToast } = useToast();
  const [adding, setAdding] = useState("");

  const records = [...beetles, ...larvae];
  const species = tuningTargets(
    records.map((x) => x.species),
    customSpecies
  );

  const add = () => {
    const result = checkSpeciesName(adding, customSpecies);
    if ("issue" in result) {
      showToast(ISSUE_TEXT[result.issue], "error");
      return;
    }
    addCustomSpecies(result.name);
    setAdding("");
    showToast(`${result.name} を足しました`);
  };

  const remove = (name: string) => {
    // 記録が残っているものを選択肢から外すと、その記録を直すときに
    // 品種が「その他」に落ちてしまう
    if (speciesInUse(name, records)) {
      showToast("この品種の記録があるので、一覧から外せません", "error");
      return;
    }
    removeCustomSpecies(name);
    showToast(`${name} を外しました`);
  };

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
        {species.map((name) => (
          <SpeciesRow
            key={name}
            species={name}
            onRemove={
              customSpecies.includes(name) && !speciesInUse(name, records)
                ? () => remove(name)
                : undefined
            }
          />
        ))}
      </div>

      {/* 品種を足す */}
      <div className="mt-3">
        <div className="flex gap-2">
          <input
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
            placeholder="例: タランドゥスオオツヤクワガタ"
            maxLength={SPECIES_NAME_MAX}
            className="kuwa-input flex-1 min-w-0"
          />
          <button
            onClick={add}
            disabled={adding.trim() === ""}
            aria-label="品種を足す"
            className="kuwa-btn-ghost px-4 flex items-center justify-center flex-shrink-0 active:scale-95 transition-all disabled:opacity-40"
          >
            <Plus className="w-4 h-4" strokeWidth={2.6} />
          </button>
        </div>
        <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
          一覧に無い品種は、ここで足すと登録画面でも選べるようになります。
          毎回「その他」で打つと表記がぶれ、目安や組める相手の候補が分かれてしまいます。
        </p>
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
