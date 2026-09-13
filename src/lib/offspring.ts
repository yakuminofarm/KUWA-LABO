/**
 * 種親としての成績。
 *
 * 血統が「さかのぼる側」なら、こちらは「下る側」。
 * ブリードで次に何を組むかを決めるとき、知りたいのは
 * 「この親から何頭採れて、どこまで大きくなったか」で、その材料は
 * ライン → 幼虫 → 引き上げた成虫 とすでに繋がっている。
 *
 * 幼虫のレコードは1件で複数頭を表せる (`count`) ので、
 * 数えるときは必ず headCount / totalHeads を通す。
 */
import { Beetle, BreedingLine, Larva } from "@/types";
import { headCount, totalHeads } from "@/lib/breeding";

export interface LineResult {
  line: BreedingLine;
  /** 割り出した頭数 (幼虫レコードの頭数合計) */
  larvaHeads: number;
  /** いま生きている頭数 */
  aliveHeads: number;
  /** 羽化までいった頭数 */
  emergedHeads: number;
  /** 羽化サイズが分かっているもののうち、いちばん大きい値 (mm) */
  bestSizeMm?: number;
}

export interface ParentResult {
  lines: LineResult[];
  larvaHeads: number;
  aliveHeads: number;
  emergedHeads: number;
  bestSizeMm?: number;
}

/**
 * 羽化サイズ。幼虫レコードに入っていればそれを使い、
 * 成虫へ引き上げてから測り直していればそちらを採る
 */
function sizeOf(larva: Larva, beetleById: Map<string, Beetle>): number | undefined {
  const promoted = larva.promotedBeetleId ? beetleById.get(larva.promotedBeetleId) : undefined;
  return promoted?.sizeMm ?? larva.emergedSizeMm;
}

/** 羽化までいったか。日付か、サイズか、引き上げた成虫のどれかがあれば羽化 */
function hasEmerged(larva: Larva, beetleById: Map<string, Beetle>): boolean {
  if (larva.emergedDate || larva.emergedSizeMm != null) return true;
  return larva.promotedBeetleId != null && beetleById.has(larva.promotedBeetleId);
}

function max(a: number | undefined, b: number | undefined): number | undefined {
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
}

/** 1つのラインの成績 */
export function lineResult(
  line: BreedingLine,
  larvae: Larva[],
  beetles: Beetle[]
): LineResult {
  const beetleById = new Map(beetles.map((b) => [b.id, b]));
  const mine = larvae.filter((l) => l.lineId === line.id);

  let bestSizeMm: number | undefined;
  let emergedHeads = 0;
  for (const l of mine) {
    if (!hasEmerged(l, beetleById)) continue;
    emergedHeads += headCount(l);
    bestSizeMm = max(bestSizeMm, sizeOf(l, beetleById));
  }

  return {
    line,
    larvaHeads: totalHeads(mine),
    aliveHeads: totalHeads(mine.filter((l) => l.isAlive)),
    emergedHeads,
    bestSizeMm,
  };
}

/**
 * この個体を種親に使ったライン全部の成績。
 * 種親に使っていなければ lines は空になる
 */
export function parentResult(
  beetle: Beetle,
  lines: BreedingLine[],
  larvae: Larva[],
  beetles: Beetle[]
): ParentResult {
  const mine = lines.filter((l) => l.maleId === beetle.id || l.femaleId === beetle.id);
  const results = mine.map((l) => lineResult(l, larvae, beetles));

  return {
    lines: results,
    larvaHeads: results.reduce((s, r) => s + r.larvaHeads, 0),
    aliveHeads: results.reduce((s, r) => s + r.aliveHeads, 0),
    emergedHeads: results.reduce((s, r) => s + r.emergedHeads, 0),
    bestSizeMm: results.reduce<number | undefined>((s, r) => max(s, r.bestSizeMm), undefined),
  };
}
