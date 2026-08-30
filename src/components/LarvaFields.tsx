"use client";

import { DatePrecision, Gender, Larva, LarvaStage } from "@/types";
import { DateField } from "@/components/DateField";
import { MoneyInput } from "@/components/KuwaUI";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/breeding";
import { SpeciesSelect } from "@/components/SpeciesSelect";
import { useKuwagataStore } from "@/store/kuwagataStore";

/**
 * 幼虫の入力欄。登録と編集で同じものを使う。
 *
 * 蛹化日・羽化日はボタンで記録されるが、押す日を間違えることがある。
 * 記録した本人しか気づけないので、編集では直せるようにしておく (showGrowth)。
 */

export interface LarvaFormState {
  code: string;
  lineId: string;
  species: string;
  customSpecies: string;
  stage: LarvaStage;
  count: string;
  gender: Gender;
  hatchDate: string;
  hatchDatePrecision?: DatePrecision;
  priceYen: string;
  pupaDate: string;
  emergedDate: string;
  emergedSizeMm: string;
  dugOutDate: string;
  notes: string;
}

const inputCls = "kuwa-input";
const stageOptions: LarvaStage[] = ["egg", "L1", "L2", "L3"];

export function emptyLarvaForm(): LarvaFormState {
  return {
    code: "",
    lineId: "",
    species: "オオクワガタ",
    customSpecies: "",
    stage: "L1",
    count: "1",
    gender: "unknown",
    hatchDate: new Date().toISOString().split("T")[0],
    priceYen: "",
    pupaDate: "",
    emergedDate: "",
    emergedSizeMm: "",
    dugOutDate: "",
    notes: "",
  };
}

export function larvaToForm(l: Larva, speciesOptions: readonly string[]): LarvaFormState {
  const known = speciesOptions.includes(l.species);
  return {
    code: l.code,
    lineId: l.lineId ?? "",
    species: known ? l.species : "その他",
    customSpecies: known ? "" : l.species,
    stage: l.stage,
    count: String(l.count ?? 1),
    gender: l.gender,
    hatchDate: l.hatchDate ?? "",
    hatchDatePrecision: l.hatchDatePrecision,
    priceYen: l.priceYen != null ? String(l.priceYen) : "",
    pupaDate: l.pupaDate ?? "",
    emergedDate: l.emergedDate ?? "",
    emergedSizeMm: l.emergedSizeMm != null ? String(l.emergedSizeMm) : "",
    dugOutDate: l.dugOutDate ?? "",
    notes: l.notes ?? "",
  };
}

export function formToLarva(
  f: LarvaFormState
): Omit<Larva, "id" | "isAlive" | "bottleChanges"> {
  const species = f.species === "その他" ? f.customSpecies.trim() || "その他" : f.species;
  return {
    code: f.code.trim(),
    lineId: f.lineId || undefined,
    species,
    stage: f.stage,
    count: Math.max(1, parseInt(f.count, 10) || 1),
    gender: f.gender,
    hatchDate: f.hatchDate || undefined,
    hatchDatePrecision: f.hatchDate ? f.hatchDatePrecision : undefined,
    priceYen: f.priceYen ? parseInt(f.priceYen, 10) : undefined,
    pupaDate: f.pupaDate || undefined,
    emergedDate: f.emergedDate || undefined,
    emergedSizeMm: f.emergedSizeMm ? parseFloat(f.emergedSizeMm) : undefined,
    dugOutDate: f.dugOutDate || undefined,
    notes: f.notes.trim(),
  };
}

export function isLarvaFormValid(f: LarvaFormState): boolean {
  return f.code.trim() !== "";
}

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "♂" },
  { value: "female", label: "♀" },
  { value: "unknown", label: "不明" },
];

export function LarvaFields({
  form,
  onChange,
  /** 蛹化・羽化まわりの日付。登録時はまだ無いので編集のときだけ出す */
  showGrowth = false,
}: {
  form: LarvaFormState;
  onChange: (f: LarvaFormState) => void;
  showGrowth?: boolean;
}) {
  const lines = useKuwagataStore((s) => s.lines);
  const set = (patch: Partial<LarvaFormState>) => onChange({ ...form, ...patch });

  // ラインを選んだら種類はそちらに合わせる (親と違う種類にはならない)
  const onLine = (lineId: string) => {
    const line = lines.find((l) => l.id === lineId);
    set(line ? { lineId, species: line.species, customSpecies: "" } : { lineId });
  };

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-[#40352a] mb-1">管理番号 *</label>
        <input
          value={form.code}
          onChange={(e) => set({ code: e.target.value })}
          placeholder="例: 2026-A-01"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#40352a] mb-1">出身ライン</label>
        <select value={form.lineId} onChange={(e) => onLine(e.target.value)} className={inputCls}>
          <option value="">なし (単独購入など)</option>
          {lines.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.species})
            </option>
          ))}
        </select>
      </div>

      {!form.lineId && (
        <SpeciesSelect
          value={form.species}
          custom={form.customSpecies}
          onChange={(species) => set({ species })}
          onCustomChange={(customSpecies) => set({ customSpecies })}
          className={inputCls}
        />
      )}

      <div>
        <label className="block text-sm font-medium text-[#40352a] mb-1">ステージ</label>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {(showGrowth ? STAGE_ORDER : stageOptions).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set({ stage: s })}
              className={`flex-1 min-w-[52px] py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                form.stage === s
                  ? "bg-[#55682f] text-[#fdf6e7] border-[#55682f]"
                  : "border-[rgba(107,68,35,0.16)] text-[#77644b]"
              }`}
            >
              {STAGE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DateField
          label="孵化 / 割出日"
          value={form.hatchDate}
          precision={form.hatchDatePrecision}
          onChange={(v, p) => set({ hatchDate: v, hatchDatePrecision: p })}
          clearable
        />
        <div style={{ minWidth: 0 }}>
          <label className="block text-sm font-medium text-[#40352a] mb-1">頭数</label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={form.count}
            onChange={(e) => set({ count: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>

      <p className="text-[11px] -mt-1.5 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
        割り出しで何頭も採れたときは、まとめて1つの記録にできます。
        大きくなって1頭ずつ追いたくなったら、あとから切り出せます。
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-[#40352a] mb-1">雌雄</label>
          <div className="flex gap-1.5">
            {GENDERS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => set({ gender: g.value })}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors min-h-[44px] ${
                  form.gender === g.value
                    ? "bg-[#6b4423] text-[#fdf6e7] border-[#6b4423]"
                    : "border-[rgba(107,68,35,0.16)] text-[#77644b]"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showGrowth && (
        <div
          className="rounded-2xl p-3.5 space-y-3"
          style={{ background: "var(--kuwa-bark-bg)" }}
        >
          <p className="text-xs" style={{ color: "var(--kuwa-ink-soft)" }}>
            ボタンで記録した日付も、ここで直せます
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">蛹化日</label>
              <input
                type="date"
                value={form.pupaDate}
                onChange={(e) => set({ pupaDate: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">羽化日</label>
              <input
                type="date"
                value={form.emergedDate}
                onChange={(e) => set({ emergedDate: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">羽化サイズ (mm)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.emergedSizeMm}
                onChange={(e) => set({ emergedSizeMm: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">掘り出し日</label>
              <input
                type="date"
                value={form.dugOutDate}
                onChange={(e) => set({ dugOutDate: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[#40352a] mb-1">入手金額 (税込)</label>
        <MoneyInput
          value={form.priceYen}
          onChange={(v) => set({ priceYen: v })}
          placeholder="購入した幼虫の場合"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#40352a] mb-1">メモ</label>
        <textarea
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="菌糸の銘柄・気づいたことなど"
          rows={3}
          className={`${inputCls} resize-none`}
        />
      </div>
    </>
  );
}
