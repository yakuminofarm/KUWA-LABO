/**
 * 産地・血統の呼び出し。
 *
 * 「能勢YG血統」を迎えるたびに打ち直すと、「能勢YG」「能勢YG血統」のように
 * 表記がぶれる。ぶれた産地は、血統書でも出品リストでも別の産地として並んでしまう。
 * **その品種で使ったことのある産地**を出して、押すだけで入るようにする。
 */

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
