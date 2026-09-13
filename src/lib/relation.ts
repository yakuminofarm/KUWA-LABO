/**
 * 2頭の血のつながり。
 *
 * クワガタでは兄妹掛けや親子掛けで形を固めるのが普通のやり方で、それ自体は
 * 悪いことではない。ただし続けると累代障害 (小型化・産まない・羽化不全) が
 * 出やすくなるので、いま組もうとしているペアがどういう間柄なのかは、
 * 組む前に知っておきたい。
 *
 * 近交係数のような「数字」は出さない。手元の記録は数世代ぶんしかなく、
 * 買ってきた個体には親の記録が無い。欠けた家系から出した数字は、
 * 実際よりも薄い血縁に見せてしまう。分かることだけを言葉で示す。
 */
import { Beetle, BreedingLine } from "@/types";
import { Pedigree, pedigreeOf } from "@/lib/pedigree";

/** さかのぼる世代 (本人・親・祖父母・曽祖父母) */
export const RELATION_DEPTH = 4;

export type Relation =
  | { kind: "same" }
  | { kind: "parent-child"; parent: Beetle; child: Beetle }
  /** 祖父と孫のように、親子より離れた直系 */
  | { kind: "direct"; ancestor: Beetle; descendant: Beetle }
  | { kind: "siblings" }
  /** 片親だけが同じ */
  | { kind: "half-siblings"; shared: Beetle }
  | { kind: "shared-ancestor"; shared: Beetle[] }
  /** 記録の範囲では繋がりが見つからない (無いとは言い切れない) */
  | { kind: "unrelated" };

/** その個体を生んだ♂♀ (出身ラインから引く) */
function parentsOf(
  b: Beetle,
  beetleById: Map<string, Beetle>,
  lineById: Map<string, BreedingLine>
): Beetle[] {
  const line = b.sourceLineId ? lineById.get(b.sourceLineId) : undefined;
  if (!line) return [];
  return [line.maleId, line.femaleId]
    .map((id) => (id ? beetleById.get(id) : undefined))
    .filter((x): x is Beetle => x != null);
}

/** 本人を除いた祖先 (同じ個体が何度出てきても1頭) */
function ancestorsOf(
  b: Beetle,
  beetles: Beetle[],
  lines: BreedingLine[]
): Map<string, Beetle> {
  const found = new Map<string, Beetle>();
  const walk = (node: Pedigree) => {
    for (const next of [node.father, node.mother]) {
      if (!next || found.has(next.beetle.id)) continue;
      found.set(next.beetle.id, next.beetle);
      walk(next);
    }
  };
  walk(pedigreeOf(b, beetles, lines, RELATION_DEPTH));
  return found;
}

/**
 * 近いほうから順に見ていく。親子でもあり祖先でもある、という場合は
 * 近いほうの言い方を採る (「親子」と言えるなら、そう言ったほうが伝わる)。
 */
export function relationOf(
  a: Beetle,
  b: Beetle,
  beetles: Beetle[],
  lines: BreedingLine[]
): Relation {
  if (a.id === b.id) return { kind: "same" };

  const beetleById = new Map(beetles.map((x) => [x.id, x]));
  const lineById = new Map(lines.map((l) => [l.id, l]));

  const aParents = parentsOf(a, beetleById, lineById);
  const bParents = parentsOf(b, beetleById, lineById);

  if (bParents.some((p) => p.id === a.id)) return { kind: "parent-child", parent: a, child: b };
  if (aParents.some((p) => p.id === b.id)) return { kind: "parent-child", parent: b, child: a };

  // 同じ親から採れていれば兄妹。季節を変えて同じペアを組み直した場合は
  // ラインが別になるので、ラインの id ではなく親そのものを見る
  const shared = aParents.filter((p) => bParents.some((q) => q.id === p.id));
  if (shared.length >= 2) return { kind: "siblings" };
  if (shared.length === 1) return { kind: "half-siblings", shared: shared[0] };

  const aAncestors = ancestorsOf(a, beetles, lines);
  const bAncestors = ancestorsOf(b, beetles, lines);

  if (bAncestors.has(a.id)) return { kind: "direct", ancestor: a, descendant: b };
  if (aAncestors.has(b.id)) return { kind: "direct", ancestor: b, descendant: a };

  const common = [...aAncestors.values()].filter((x) => bAncestors.has(x.id));
  if (common.length > 0) return { kind: "shared-ancestor", shared: common };

  return { kind: "unrelated" };
}

/** どれくらい近いか。UI の見せ方を変えるのに使う */
export function isClose(r: Relation): boolean {
  return r.kind === "same" || r.kind === "parent-child" || r.kind === "direct" || r.kind === "siblings";
}
