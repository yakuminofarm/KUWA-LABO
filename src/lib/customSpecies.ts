/**
 * 自分で足した品種。
 *
 * 組み込みの一覧に無い品種を飼っている人は、これまで「その他」を選んで毎回
 * 名前を打つしかなかった。打つたびに表記がぶれると、
 *
 * - 品種ごとの目安が別々に分かれる (「ニジイロ」と「ニジイロクワガタ」)
 * - 組める相手の候補から漏れる (同じ種類かどうかは名前で見ている)
 *
 * ので、一度足したら選べるようにする。足した品種は記録が1件も無くても
 * 「品種ごとの目安」に並ぶ — 迎える前に目安を決めておけるように。
 */
import { SPECIES_GROUPS, SPECIES_OPTIONS } from "@/lib/breeding";

/** 品種名の長さの上限。一覧やラベルに収めるため */
export const SPECIES_NAME_MAX = 30;

/**
 * 名前をそろえる。前後の空白を落とし、間の空白は1つにまとめる。
 * 「オオクワガタ 」と「オオクワガタ」を別物にしないため
 */
export function normalizeSpeciesName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export type SpeciesNameIssue =
  /** 空 */
  | "empty"
  /** 長すぎる */
  | "too-long"
  /** 組み込みか、すでに足してある */
  | "duplicate";

/** 足してよい名前か。通れば、そろえたあとの名前を返す */
export function checkSpeciesName(
  raw: string,
  custom: string[]
): { name: string } | { issue: SpeciesNameIssue } {
  const name = normalizeSpeciesName(raw);
  if (name === "") return { issue: "empty" };
  if (name.length > SPECIES_NAME_MAX) return { issue: "too-long" };
  // 「その他」は選択肢の仕組みで使っているので、名前としては使わせない
  if (SPECIES_OPTIONS.includes(name) || custom.includes(name)) return { issue: "duplicate" };
  return { name };
}

/**
 * 組み込みの一覧に無いのに、記録では使われている品種。
 *
 * 「その他」で打った品種は、これまで記録に残るだけで**次から選べなかった**。
 * 打ち直すたびに表記がぶれるので、一度使った名前は選べるようにする。
 */
export function extraSpecies(custom: string[], inUse: string[]): string[] {
  const names = [...custom, ...inUse]
    .map(normalizeSpeciesName)
    .filter((s) => s !== "" && !isBuiltInSpecies(s));
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, "ja"));
}

/** 組み込みの一覧にある品種か。足す・直す前の確かめに使う */
export function isBuiltInSpecies(name: string): boolean {
  return SPECIES_OPTIONS.includes(name);
}

/** 選択肢の並び。自分で足したぶんは最後にまとめる */
export function speciesGroupsWith(custom: string[]): { label: string; species: string[] }[] {
  if (custom.length === 0) return SPECIES_GROUPS;
  return [...SPECIES_GROUPS, { label: "自分で足した品種", species: custom }];
}

/** 「その他」も含めた、選べる名前の全部 */
export function allSpeciesOptions(custom: string[]): string[] {
  return [...SPECIES_OPTIONS, ...custom];
}

/**
 * 品種の名前を直したときに、記録のほうも付け替える。
 *
 * 直せないと、打ち間違えた名前がずっと選択肢に残り、その記録だけ仲間外れに
 * なる (目安も、組める相手の候補も、名前で見ているため)。
 */
export type RenameIssue = SpeciesNameIssue | "same" | "built-in";

export function checkRename(
  from: string,
  raw: string,
  custom: string[],
  inUse: string[]
): { name: string; merging: boolean } | { issue: RenameIssue } {
  // 組み込みの名前は直せない。直すと、次の更新で足された名前と食い違う
  if (isBuiltInSpecies(from)) return { issue: "built-in" };
  const name = normalizeSpeciesName(raw);
  if (name === "") return { issue: "empty" };
  if (name.length > SPECIES_NAME_MAX) return { issue: "too-long" };
  if (name === from) return { issue: "same" };
  // 行き先が組み込みでも、すでにある名前でも、そこへまとめるだけ。
  // 「ニジイロ」を「ニジイロクワガタ」に直したい、が実際に起きる
  const merging = isBuiltInSpecies(name) || custom.includes(name) || inUse.includes(name);
  return { name, merging };
}

/**
 * 「品種ごとの目安」に並べる品種。
 * 手元にいるものと、自分で足したものを合わせ、名前の順にそろえる
 */
export function tuningTargets(inUse: string[], custom: string[]): string[] {
  return [...new Set([...inUse, ...custom])].sort((a, b) => a.localeCompare(b, "ja"));
}

/** その品種の記録があるか。消してよいかの判断に使う */
export function speciesInUse(name: string, records: { species: string }[]): boolean {
  return records.some((r) => r.species === name);
}
