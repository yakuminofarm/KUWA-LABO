"use client";

import { ReactNode } from "react";
import { Beetle, DatePrecision, Gender } from "@/types";
import { DateField } from "@/components/DateField";
import { genderColor } from "@/lib/breeding";
import { MoneyInput } from "@/components/KuwaUI";
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
  emergedDatePrecision?: DatePrecision;
  acquiredDate: string;
  acquiredDatePrecision?: DatePrecision;
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
    emergedDatePrecision: b.emergedDatePrecision,
    acquiredDate: b.acquiredDate,
    acquiredDatePrecision: b.acquiredDatePrecision,
    priceYen: b.priceYen != null ? String(b.priceYen) : "",
    matured: !!b.matured,
    notes: b.notes ?? "",
  };
}

/**
 * 同じ親から採れた兄弟をまとめて登録するための複製。
 * 血統にかかわる情報は引き継ぎ、その個体だけのもの (愛称・体長・写真・
 * エサやりや販売の記録) は引き継がない。管理番号は末尾の数字を1つ進める。
 * 入手金額も引き継がない。同じ金額を頭数ぶん写すと、支払っていない額まで
 * 総支出に積み上がってしまうため。
 */
export function duplicateBeetleForm(
  b: Beetle,
  speciesOptions: readonly string[],
  existingCodes: readonly string[]
): BeetleFormState {
  return {
    ...beetleToForm(b, speciesOptions),
    code: nextCode(b.code, existingCodes),
    name: "",
    sizeMm: "",
    priceYen: "",
  };
}

/** "26OK-A1" → "26OK-A2"。すでにある番号は飛ばす。数字が無ければ空にする */
export function nextCode(code: string, existing: readonly string[]): string {
  const m = code.match(/^(.*?)(\d+)$/);
  if (!m) return "";
  const [, head, digits] = m;
  const taken = new Set(existing);
  for (let n = parseInt(digits, 10) + 1; n < parseInt(digits, 10) + 200; n++) {
    // 元が "01" なら "02" になるよう桁を保つ
    const candidate = head + String(n).padStart(digits.length, "0");
    if (!taken.has(candidate)) return candidate;
  }
  return "";
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
    emergedDatePrecision: f.emergedDate ? f.emergedDatePrecision : undefined,
    acquiredDate: f.acquiredDate,
    acquiredDatePrecision: f.acquiredDatePrecision,
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

/**
 * ペア登録で、♂♀それぞれにだけ関わる欄。
 * 種類・産地・累代・入手日・金額はペアで同じなので共通側 (BeetleFields) に置き、
 * ここには1頭ずつ違うものだけを並べる。
 */
export interface PairMemberState {
  code: string;
  name: string;
  sizeMm: string;
  emergedDate: string;
  emergedDatePrecision?: DatePrecision;
}

export function emptyPairMember(): PairMemberState {
  return { code: "", name: "", sizeMm: "", emergedDate: "" };
}

export function PairMemberFields({
  gender,
  form,
  onChange,
}: {
  gender: "male" | "female";
  form: PairMemberState;
  onChange: (f: PairMemberState) => void;
}) {
  const set = (patch: Partial<PairMemberState>) => onChange({ ...form, ...patch });
  const male = gender === "male";

  return (
    <div className="rounded-2xl p-3.5 space-y-3" style={{ background: "var(--kuwa-bark-bg)" }}>
      <p className={`text-sm font-bold ${genderColor(gender)}`}>{male ? "♂ オス" : "♀ メス"}</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-[#40352a] mb-1">管理番号 *</label>
          <input
            value={form.code}
            onChange={(e) => set({ code: e.target.value })}
            placeholder={male ? "例: 26OK-A1" : "例: 26OK-A2"}
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-[#40352a] mb-1">体長 (mm)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.sizeMm}
            onChange={(e) => set({ sizeMm: e.target.value })}
            placeholder={male ? "例: 85.5" : "例: 52.0"}
            className={inputCls}
          />
        </div>
        <DateField
          label="羽化日"
          value={form.emergedDate}
          precision={form.emergedDatePrecision}
          onChange={(v, p) => set({ emergedDate: v, emergedDatePrecision: p })}
          clearable
        />
      </div>
    </div>
  );
}

export function BeetleFields({
  form,
  onChange,
  /** 後食は詳細画面に専用の導線があるので、編集では出さない */
  showMatured = true,
  /**
   * その子だけの欄 (管理番号・愛称・性別・体長・羽化日) を出すか。
   * ペア登録では2頭ぶんを別に並べるので、共通の欄だけを借りる
   */
  showIdentity = true,
  /** ペア登録では「ペアの合計」だと分かるように言い換える */
  priceLabel,
  /** 金額欄の下に添える説明 (ペアの割り振り結果など) */
  priceHint,
}: {
  form: BeetleFormState;
  onChange: (f: BeetleFormState) => void;
  showMatured?: boolean;
  showIdentity?: boolean;
  priceLabel?: string;
  priceHint?: ReactNode;
}) {
  const set = (patch: Partial<BeetleFormState>) => onChange({ ...form, ...patch });

  return (
    <>
      {showIdentity && (
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
      )}

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

      {showIdentity && (
        <>
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
            <DateField
              label="羽化日"
              value={form.emergedDate}
              precision={form.emergedDatePrecision}
              onChange={(v, p) => set({ emergedDate: v, emergedDatePrecision: p })}
              clearable
              hint="買った個体などで分からなければ空欄でOK"
            />
          </div>
        </>
      )}

      <div className={showMatured ? "grid grid-cols-2 gap-3 items-end" : ""}>
        <DateField
          label="入手日"
          required
          value={form.acquiredDate}
          precision={form.acquiredDatePrecision}
          onChange={(v, p) => set({ acquiredDate: v, acquiredDatePrecision: p })}
        />
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
        <label className="block text-sm font-medium text-[#40352a] mb-1">
          {priceLabel ?? "入手金額 (円)"}
        </label>
        <MoneyInput
          value={form.priceYen}
          onChange={(v) => set({ priceYen: v })}
          placeholder="15000 (収支管理に反映されます)"
        />
        {priceHint}
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
