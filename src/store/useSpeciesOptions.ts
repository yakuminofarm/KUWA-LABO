"use client";

import { useKuwagataStore } from "@/store/kuwagataStore";
import { allSpeciesOptions, extraSpecies } from "@/lib/customSpecies";

/**
 * いま選べる品種の名前。
 *
 * 組み込み + 自分で足した品種 + **記録で使っている品種**。
 * 「その他」で打った品種も、一度使えば次から選べる。
 */
export function useExtraSpecies(): string[] {
  const custom = useKuwagataStore((s) => s.customSpecies);
  const beetles = useKuwagataStore((s) => s.beetles);
  const larvae = useKuwagataStore((s) => s.larvae);
  const lines = useKuwagataStore((s) => s.lines);
  return extraSpecies(custom, [...beetles, ...larvae, ...lines].map((x) => x.species));
}

/** 「その他」も含めた、選べる名前の全部 */
export function useSpeciesOptions(): string[] {
  return allSpeciesOptions(useExtraSpecies());
}
