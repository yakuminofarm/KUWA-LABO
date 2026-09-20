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
