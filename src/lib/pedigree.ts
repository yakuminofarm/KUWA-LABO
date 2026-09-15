/**
 * 血統 (親をたどった家系)。
 *
 * 記録のうえでは、子から親へこう繋がっている。
 *
 *   成虫 → sourceLineId → ブリードライン → maleId / femaleId → 親の成虫
 *
 * 幼虫から成虫へ引き上げるときに出身ラインを写しているので、
 * 自分で採った子は何もしなくても親までたどれる。買ってきた個体は
 * 出身ラインが無いので、そこで家系が途切れる (それが正しい)。
 */
import { Beetle, BreedingLine } from "@/types";

/** 何世代さかのぼるか (本人・親・祖父母) */
export const PEDIGREE_DEPTH = 3;

export interface Pedigree {
  beetle: Beetle;
  /** この個体を生んだライン。親が分かる手がかりであり、表示にも使う */
  line?: BreedingLine;
  father?: Pedigree;
  mother?: Pedigree;
}

/**
 * 親をたどる。`depth` を数え切るか、親の記録が無くなったところで止まる。
 *
 * クワガタでは同じ個体を何度も掛ける (兄妹・親子の掛け合わせ) ことが普通にあり、
 * 父方と母方の両方に同じ祖先が出てくるのは珍しくない。だから「もう出てきた祖先」を
 * 全体で覚えて打ち切ってはいけない。いま辿ってきた道すじにだけ出ていないかを見て、
 * 記録が輪になっている (自分の子孫を親に指してある) 場合の無限ループだけを避ける。
 */
export function pedigreeOf(
  beetle: Beetle,
  beetles: Beetle[],
  lines: BreedingLine[],
  depth: number = PEDIGREE_DEPTH
): Pedigree {
  const beetleById = new Map(beetles.map((b) => [b.id, b]));
  const lineById = new Map(lines.map((l) => [l.id, l]));

  const build = (b: Beetle, path: Set<string>, left: number): Pedigree => {
    const line = b.sourceLineId ? lineById.get(b.sourceLineId) : undefined;
    if (left <= 1 || !line) return { beetle: b, line };

    const parent = (id?: string): Pedigree | undefined => {
      if (!id || path.has(id)) return undefined;
      const p = beetleById.get(id);
      if (!p) return undefined;
      return build(p, new Set(path).add(id), left - 1);
    };

    return {
      beetle: b,
      line,
      father: parent(line.maleId),
      mother: parent(line.femaleId),
    };
  };

  return build(beetle, new Set([beetle.id]), depth);
}

/**
 * 続柄の言い方。世代をさかのぼる数と性別で決まる。
 *
 * 一覧・図・血統書の3か所で出すので、言い方がずれないようここに置く。
 * 数え方は本人からの距離で、1 が親、2 が祖父母。
 */
export function roleLabel(depth: number, male: boolean): string {
  if (depth === 1) return male ? "父" : "母";
  if (depth === 2) return male ? "祖父" : "祖母";
  if (depth === 3) return male ? "曽祖父" : "曽祖母";
  return male ? "父方の先祖" : "母方の先祖";
}

/** 親が1頭でも分かっているか (分からなければ血統の欄を出す意味がない) */
export function hasParents(p: Pedigree): boolean {
  return Boolean(p.father || p.mother);
}

/** 家系に出てくる本人以外の頭数 (同じ個体が父方と母方に出たら1頭と数える) */
export function ancestorCount(p: Pedigree): number {
  const seen = new Set<string>();
  const walk = (node: Pedigree) => {
    for (const next of [node.father, node.mother]) {
      if (!next || seen.has(next.beetle.id)) continue;
      seen.add(next.beetle.id);
      walk(next);
    }
  };
  walk(p);
  return seen.size;
}
