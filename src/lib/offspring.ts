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

function resultOf(
  line: BreedingLine,
  mine: Larva[],
  beetleById: Map<string, Beetle>
): LineResult {
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
 * ライン全部の成績をまとめて出す。
 *
 * 一覧では行ごとに成績を出すので、1本ずつ `lineResult` を呼ぶと
 * 成虫の索引と幼虫の絞り込みをライン数ぶん作り直すことになる。
 * ここで索引を1回だけ作って配る (順番は渡したラインのまま)。
 */
export function lineResults(
  lines: BreedingLine[],
  larvae: Larva[],
  beetles: Beetle[]
): LineResult[] {
  const beetleById = new Map(beetles.map((b) => [b.id, b]));
  const byLine = new Map<string, Larva[]>();
  for (const l of larvae) {
    if (!l.lineId) continue;
    const bucket = byLine.get(l.lineId);
    if (bucket) bucket.push(l);
    else byLine.set(l.lineId, [l]);
  }
  return lines.map((line) => resultOf(line, byLine.get(line.id) ?? [], beetleById));
}

/** 1つのラインの成績 */
export function lineResult(
  line: BreedingLine,
  larvae: Larva[],
  beetles: Beetle[]
): LineResult {
  return resultOf(
    line,
    larvae.filter((l) => l.lineId === line.id),
    new Map(beetles.map((b) => [b.id, b]))
  );
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
  const results = lineResults(mine, larvae, beetles);

  return {
    lines: results,
    larvaHeads: results.reduce((s, r) => s + r.larvaHeads, 0),
    aliveHeads: results.reduce((s, r) => s + r.aliveHeads, 0),
    emergedHeads: results.reduce((s, r) => s + r.emergedHeads, 0),
    bestSizeMm: results.reduce<number | undefined>((s, r) => max(s, r.bestSizeMm), undefined),
  };
}

/**
 * 成績のよいライン順に並べるための比較。
 *
 * 何をもって「よい」とするかは人によるが、次に何を組むか決めるときに
 * まず見るのは**その血から出た最大個体**なので、それを先に見る。
 * 同じなら羽化までいった頭数、それも同じなら採れた頭数で比べる。
 *
 * サイズが分かっていないラインは後ろに置く。0mm として扱うと
 * 「小さかったライン」と見分けが付かなくなる。
 */
export function byResult(a: LineResult, b: LineResult): number {
  if (a.bestSizeMm != null || b.bestSizeMm != null) {
    if (a.bestSizeMm == null) return 1;
    if (b.bestSizeMm == null) return -1;
    if (a.bestSizeMm !== b.bestSizeMm) return b.bestSizeMm - a.bestSizeMm;
  }
  if (a.emergedHeads !== b.emergedHeads) return b.emergedHeads - a.emergedHeads;
  return b.larvaHeads - a.larvaHeads;
}
