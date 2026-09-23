"use client";

import { useKuwagataStore } from "@/store/kuwagataStore";
import { knownLocalities } from "@/lib/locality";

/**
 * 産地・血統の欄。
 *
 * その品種で使ったことのある産地を下に並べ、押すだけで入るようにする。
 * 打ち直すたびに「能勢YG」「能勢YG血統」と表記がぶれると、血統書でも
 * 出品リストでも別の産地として並んでしまう。
 */
export function LocalityField({
  value,
  onChange,
  species,
  labelClass = "text-sm font-medium text-[#40352a]",
}: {
  value: string;
  onChange: (v: string) => void;
  /** いま選んでいる品種。産地の名前は品種ごとに違う */
  species: string;
  labelClass?: string;
}) {
  const beetles = useKuwagataStore((s) => s.beetles);
  const known = knownLocalities(beetles, species);
  const current = value.trim();

  return (
    <div>
      <label className={`block mb-1 ${labelClass}`}>産地・血統</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例: 能勢YG血統"
        className="kuwa-input"
      />

      {known.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 mt-2">
            {known.map((name) => (
              <button
                key={name}
                type="button"
                // もう一度押すと外せる。押し間違えたときに打ち直さなくて済む
                onClick={() => onChange(current === name ? "" : name)}
                data-on={current === name}
                className="kuwa-chip font-maru"
                style={{ padding: "5px 12px", fontSize: 11 }}
              >
                {name}
              </button>
            ))}
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: "var(--kuwa-ink-soft)" }}>
            {species}で使ったことのある産地です
          </p>
        </>
      )}
    </div>
  );
}
