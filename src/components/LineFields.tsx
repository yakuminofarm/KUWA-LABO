"use client";

import { BreedingLine } from "@/types";
import { SpeciesSelect } from "@/components/SpeciesSelect";
import { useKuwagataStore } from "@/store/kuwagataStore";

/**
 * ブリードラインの入力欄。登録と編集で同じものを使う。
 *
 * セット投入日・割り出し日・採卵数はボタンや進行に応じて入るが、
 * 後から数え直したり日付を間違えたりするので、編集では直せるようにする (showProgress)。
 */

export interface LineFormState {
  name: string;
  species: string;
  customSpecies: string;
  maleId: string;
  femaleId: string;
  pairingDate: string;
  setDate: string;
  setType: string;
  splitDate: string;
  eggCount: string;
  larvaCount: string;
  notes: string;
}

const inputCls = "kuwa-input";

export function emptyLineForm(): LineFormState {
  return {
    name: "",
    species: "オオクワガタ",
    customSpecies: "",
    maleId: "",
    femaleId: "",
    pairingDate: new Date().toISOString().split("T")[0],
    setDate: "",
    setType: "",
    splitDate: "",
    eggCount: "",
    larvaCount: "",
    notes: "",
  };
}

export function lineToForm(l: BreedingLine, speciesOptions: readonly string[]): LineFormState {
  const known = speciesOptions.includes(l.species);
  return {
    name: l.name,
    species: known ? l.species : "その他",
    customSpecies: known ? "" : l.species,
    maleId: l.maleId ?? "",
    femaleId: l.femaleId ?? "",
    pairingDate: l.pairingDate ?? "",
    setDate: l.setDate ?? "",
    setType: l.setType ?? "",
    splitDate: l.splitDate ?? "",
    eggCount: l.eggCount != null ? String(l.eggCount) : "",
    larvaCount: l.larvaCount != null ? String(l.larvaCount) : "",
    notes: l.notes ?? "",
  };
}

export function formToLine(f: LineFormState): Omit<BreedingLine, "id" | "status"> {
  const species = f.species === "その他" ? f.customSpecies.trim() || "その他" : f.species;
  return {
    name: f.name.trim(),
    species,
    maleId: f.maleId || undefined,
    femaleId: f.femaleId || undefined,
    pairingDate: f.pairingDate || undefined,
    setDate: f.setDate || undefined,
    setType: f.setType.trim() || undefined,
    splitDate: f.splitDate || undefined,
    eggCount: f.eggCount ? parseInt(f.eggCount, 10) : undefined,
    larvaCount: f.larvaCount ? parseInt(f.larvaCount, 10) : undefined,
    notes: f.notes.trim(),
  };
}

export function isLineFormValid(f: LineFormState): boolean {
  return f.name.trim() !== "";
}

export function LineFields({
  form,
  onChange,
  /** 産卵セット以降の記録。登録時はまだ無いので編集のときだけ出す */
  showProgress = false,
}: {
  form: LineFormState;
  onChange: (f: LineFormState) => void;
  showProgress?: boolean;
}) {
  const beetles = useKuwagataStore((s) => s.beetles);
  const set = (patch: Partial<LineFormState>) => onChange({ ...form, ...patch });

  const pickable = beetles.filter((b) => b.isAlive && b.soldPriceYen == null);
  const males = pickable.filter((b) => b.gender === "male");
  const females = pickable.filter((b) => b.gender === "female");
  const label = (id: string) => {
    const b = beetles.find((x) => x.id === id);
    if (!b) return "";
    return `${b.code}${b.name ? ` (${b.name})` : ""} / ${b.species}`;
  };

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-[#40352a] mb-1">ライン名 *</label>
        <input
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="例: 2026-A"
          className={inputCls}
        />
      </div>

      <SpeciesSelect
        value={form.species}
        custom={form.customSpecies}
        onChange={(species) => set({ species })}
        onCustomChange={(customSpecies) => set({ customSpecies })}
        className={inputCls}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-[#40352a] mb-1">♂ 種親オス</label>
          <select
            value={form.maleId}
            onChange={(e) => set({ maleId: e.target.value })}
            className={inputCls}
          >
            <option value="">未選択</option>
            {males.map((b) => (
              <option key={b.id} value={b.id}>
                {label(b.id)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#40352a] mb-1">♀ 種親メス</label>
          <select
            value={form.femaleId}
            onChange={(e) => set({ femaleId: e.target.value })}
            className={inputCls}
          >
            <option value="">未選択</option>
            {females.map((b) => (
              <option key={b.id} value={b.id}>
                {label(b.id)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#40352a] mb-1">ペアリング開始日</label>
        <input
          type="date"
          value={form.pairingDate}
          onChange={(e) => set({ pairingDate: e.target.value })}
          className={inputCls}
        />
      </div>

      {showProgress && (
        <div className="rounded-2xl p-3.5 space-y-3" style={{ background: "var(--kuwa-bark-bg)" }}>
          <p className="text-xs" style={{ color: "var(--kuwa-ink-soft)" }}>
            産卵セット以降の記録も、ここで直せます
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">セット投入日</label>
              <input
                type="date"
                value={form.setDate}
                onChange={(e) => set({ setDate: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">割り出し日</label>
              <input
                type="date"
                value={form.splitDate}
                onChange={(e) => set({ splitDate: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#40352a] mb-1">セット内容</label>
            <input
              value={form.setType}
              onChange={(e) => set({ setType: e.target.value })}
              placeholder="例: 産卵材2本 + 発酵マット"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">採卵数</label>
              <input
                type="number"
                min="0"
                value={form.eggCount}
                onChange={(e) => set({ eggCount: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">割り出し幼虫数</label>
              <input
                type="number"
                min="0"
                value={form.larvaCount}
                onChange={(e) => set({ larvaCount: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[#40352a] mb-1">メモ</label>
        <textarea
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="ペアリング方法・気づいたことなど"
          rows={3}
          className={`${inputCls} resize-none`}
        />
      </div>
    </>
  );
}
