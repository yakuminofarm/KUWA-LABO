"use client";

import { SPECIES_GROUPS } from "@/lib/breeding";

/**
 * 種類の選択。国産・外国産に分けて出す。
 * 「その他」を選んだときだけ自由入力が出るところまで含めて1つにまとめてある
 * (成虫・幼虫・ラインの3画面で同じものを使うため)。
 */
export function SpeciesSelect({
  value,
  custom,
  onChange,
  onCustomChange,
  className = "kuwa-input",
  label = "種類",
}: {
  value: string;
  custom: string;
  onChange: (species: string) => void;
  onCustomChange: (custom: string) => void;
  className?: string;
  label?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#40352a] mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      >
        {SPECIES_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.species.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </optgroup>
        ))}
        <option value="その他">その他</option>
      </select>
      {value === "その他" && (
        <input
          value={custom}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="種類名を入力"
          className={`mt-2 ${className}`}
        />
      )}
    </div>
  );
}
