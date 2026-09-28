/**
 * 産地・血統の呼び出し。
 *
 * 「能勢YG血統」を迎えるたびに打ち直すと、「能勢YG」「能勢YG血統」のように
 * 表記がぶれる。ぶれた産地は、血統書でも出品リストでも別の産地として並んでしまう。
 * **その品種で使ったことのある産地**を出して、押すだけで入るようにする。
 */

/** 産地の名前の長さの上限。血統書や出品リストに収めるため */
export const LOCALITY_NAME_MAX = 40;

/** 一度に出す数。多すぎると探すことになるので、よく使うぶんだけ */
export const LOCALITY_MAX = 8;

/**
 * その品種で使ったことのある産地。新しく使ったものほど前に出す。
 *
 * **品種でしぼる。** 産地の名前は品種ごとに違う (オオクワガタに「パラワン島」は
 * 出てこない)。全部の産地を混ぜると、その品種にありえない候補が並ぶ。
 */
export function knownLocalities(
  beetles: readonly { locality?: string; species: string }[],
  species: string,
  limit: number = LOCALITY_MAX
): string[] {
  const lastUsed = new Map<string, number>();
  beetles.forEach((b, i) => {
    const name = (b.locality ?? "").trim();
    if (!name || b.species !== species) return;
    lastUsed.set(name, i);
  });
  return [...lastUsed.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, limit);
}

/** 品種ごとの、使っている産地とその頭数 */
export interface LocalityUse {
  species: string;
  name: string;
  count: number;
}

/**
 * 手元で使っている産地の一覧。品種ごとにまとめ、多い順に出す。
 *
 * **品種ごとに分ける。** 同じ「久留米」でも品種が違えば別の血統であり、
 * 片方だけ名前を直したいことがある。
 */
export function localityUses(
  beetles: readonly { locality?: string; species: string }[]
): LocalityUse[] {
  const count = new Map<string, LocalityUse>();
  for (const b of beetles) {
    const name = (b.locality ?? "").trim();
    if (!name) continue;
    const key = `${b.species}\u0000${name}`;
    const hit = count.get(key);
    if (hit) hit.count++;
    else count.set(key, { species: b.species, name, count: 1 });
  }
  return [...count.values()].sort(
    (a, b) =>
      a.species.localeCompare(b.species, "ja") ||
      b.count - a.count ||
      a.name.localeCompare(b.name, "ja")
  );
}

export type LocalityIssue = "empty" | "too-long" | "same";

/**
 * 名前を直してよいか。
 * **すでにある産地へまとめるのは許す** (「能勢YG」を「能勢YG血統」にそろえたい)
 */
export function checkLocalityName(
  from: string,
  raw: string
): { name: string } | { issue: LocalityIssue } {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name === "") return { issue: "empty" };
  if (name.length > LOCALITY_NAME_MAX) return { issue: "too-long" };
  if (name === from) return { issue: "same" };
  return { name };
}
