"use client";

import { Beetle, Gender } from "@/types";
import { SpeciesSelect } from "@/components/SpeciesSelect";

/**
 * 成虫の入力欄。登録と編集で同じものを使う。
 *
 * 分けて持つと、片方に項目を足したときもう片方が取り残される。
 * 登録できるのに直せない項目があると、打ち間違いを作り直すしかなくなる。
 */

export interface BeetleFormState {
  code: string;
  name: string;
  species: string;
  customSpecies: string;
  locality: string;
  generation: string;
  gender: Gender;
  sizeMm: string;
  emergedDate: string;
  acquiredDate: string;
  priceYen: string;
  matured: boolean;
  notes: string;
}

const inputCls = "kuwa-input";

export function emptyBeetleForm(): BeetleFormState {
  return {
    code: "",
    name: "",
    species: "オオクワガタ",
    customSpecies: "",
    locality: "",
    generation: "",
    gender: "unknown",
    sizeMm: "",
    emergedDate: "",
    acquiredDate: new Date().toISOString().split("T")[0],
    priceYen: "",
    matured: false,
    notes: "",
  };
}

/** 選択肢に無い種類は「その他」に寄せて、自由入力側へ入れておく */
export function beetleToForm(b: Beetle, speciesOptions: readonly string[]): BeetleFormState {
  const known = speciesOptions.includes(b.species);
  return {
    code: b.code,
    name: b.name ?? "",
    species: known ? b.species : "その他",
    customSpecies: known ? "" : b.species,
    locality: b.locality ?? "",
    generation: b.generation ?? "",
    gender: b.gender,
    sizeMm: b.sizeMm != null ? String(b.sizeMm) : "",
    emergedDate: b.emergedDate ?? "",
    acquiredDate: b.acquiredDate,
    priceYen: b.priceYen != null ? String(b.priceYen) : "",
    matured: !!b.matured,
    notes: b.notes ?? "",
  };
}

export function formToBeetle(f: BeetleFormState): Omit<Beetle, "id" | "isAlive"> {
  const species = f.species === "その他" ? f.customSpecies.trim() || "その他" : f.species;
  return {
    code: f.code.trim(),
    name: f.name.trim() || undefined,
    species,
    locality: f.locality.trim() || undefined,
    generation: f.generation.trim() || undefined,
    gender: f.gender,
    sizeMm: f.sizeMm ? parseFloat(f.sizeMm) : undefined,
    emergedDate: f.emergedDate || undefined,
    acquiredDate: f.acquiredDate,
    priceYen: f.priceYen ? parseInt(f.priceYen, 10) : undefined,
    matured: f.matured,
    notes: f.notes.trim(),
  };
}

export function isBeetleFormValid(f: BeetleFormState): boolean {
  return f.code.trim() !== "" && f.acquiredDate !== "";
}

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "♂ オス" },
  { value: "female", label: "♀ メス" },
  { value: "unknown", label: "不明" },
];

export function BeetleFields({
  form,
  onChange,
  /** 後食は詳細画面に専用の導線があるので、編集では出さない */
  showMatured = true,
}: {
  form: BeetleFormState;
  onChange: (f: BeetleFormState) => void;
  showMatured?: boolean;
}) {
  const set = (patch: Partial<BeetleFormState>) => onChange({ ...form, ...patch });

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-[#40352a] mb-1">管理番号 *</label>
          <input
            value={form.code}
            onChange={(e) => set({ code: e.target.value })}
            placeholder="例: 26OK-A1"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#40352a] mb-1">愛称</label>
          <input
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="任意"
            className={inputCls}
          />
        </div>
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
          <label className="block text-sm font-medium text-[#40352a] mb-1">産地・血統</label>
          <input
            value={form.locality}
            onChange={(e) => set({ locality: e.target.value })}
            placeholder="例: 能勢YG血統"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#40352a] mb-1">累代</label>
          <input
            value={form.generation}
            onChange={(e) => set({ generation: e.target.value })}
            placeholder="例: CBF2 / WD"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#40352a] mb-1">性別</label>
        <div className="flex gap-2">
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-[#40352a] mb-1">体長 (mm)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.sizeMm}
            onChange={(e) => set({ sizeMm: e.target.value })}
            placeholder="例: 85.5"
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

      <div className={showMatured ? "grid grid-cols-2 gap-3 items-end" : ""}>
        <div>
          <label className="block text-sm font-medium text-[#40352a] mb-1">入手日 *</label>
          <input
            type="date"
            value={form.acquiredDate}
            onChange={(e) => set({ acquiredDate: e.target.value })}
            className={inputCls}
          />
        </div>
        {showMatured && (
          <button
            type="button"
            onClick={() => set({ matured: !form.matured })}
            className={`py-3 rounded-xl text-sm font-semibold border transition-colors min-h-[44px] ${
              form.matured
                ? "bg-[#55682f] text-[#fdf6e7] border-[#55682f]"
                : "border-[rgba(107,68,35,0.16)] text-[#77644b]"
            }`}
          >
            後食済み
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#40352a] mb-1">入手金額 (円)</label>
        <input
          type="number"
          min="0"
          value={form.priceYen}
          onChange={(e) => set({ priceYen: e.target.value })}
          placeholder="例: 15000 (収支管理に反映されます)"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#40352a] mb-1">メモ</label>
        <textarea
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="特徴・購入元など"
          rows={3}
          className={`${inputCls} resize-none`}
        />
      </div>
    </>
  );
}
