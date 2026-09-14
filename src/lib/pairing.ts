/**
 * 組める相手をさがす。
 *
 * 血統 (`pedigree.ts`) はさかのぼる側、種親としての成績 (`offspring.ts`) は
 * 下る側、血のつながり (`relation.ts`) は横の関係。次に何を組むか決めるときは
 * この3つを同時に見ることになるので、1頭を起点に並べて出す。
 *
 * 決めるのは人。ここでやるのは**順番を付けて、気をつけることを添える**ところまで。
 * 「この組み合わせが正解」とは言わない (何を狙うかは人によって違う)。
 *
 * ## 候補に入れないもの
 *
 * - **別の種類**。異種の掛け合わせはアプリから勧めない
 * - 死んでいる個体、売った個体
 * - 同じ性別 (起点の性別が分からないときは、そもそも候補を出せない)
 *
 * 産地が違う同種は候補に残す。避ける人が多いので気をつけることとして添えるが、
 * 組むかどうかは飼っている人が決める。
 */
import { Beetle, BreedingLine, Larva } from "@/types";
import { Relation, relationOf } from "@/lib/relation";
import { lineResults } from "@/lib/offspring";

export type Caution =
  /** 血が近い (兄妹・親子・直系・片親が同じ) */
  | "close-blood"
  /** 産地が違う */
  | "different-locality"
  /** まだ後食していないので、いますぐは組めない */
  | "not-matured";

export interface Candidate {
  beetle: Beetle;
  relation: Relation;
  /** この相手を種親に使って出た最大個体 (使ったことがなければ無し) */
  bestOffspringMm?: number;
  cautions: Caution[];
  /** いま組めるか (後食済みか) */
  ready: boolean;
}

/**
 * 血の遠さ。大きいほど遠い。
 *
 * 血のつながりの濃さで並べる。祖父と孫 (25%) と片親が同じ (25%) は同じ濃さ、
 * 親子 (50%) と兄妹 (50%) も同じ濃さなので、言い方は違っても同じ段に置く。
 */
export function bloodDistance(r: Relation): number {
  switch (r.kind) {
    case "same":
      return -1;
    case "parent-child":
    case "siblings":
      return 0;
    case "direct":
    case "half-siblings":
      return 1;
    case "shared-ancestor":
      return 2;
    case "unrelated":
      return 3;
  }
}

/** 産地が両方入っていて、違うか。片方でも空なら「違う」とは言わない */
function localityDiffers(a: Beetle, b: Beetle): boolean {
  const x = a.locality?.trim();
  const y = b.locality?.trim();
  if (!x || !y) return false;
  return x !== y;
}

function cautionsFor(base: Beetle, other: Beetle, relation: Relation): Caution[] {
  const out: Caution[] = [];
  if (bloodDistance(relation) <= 1) out.push("close-blood");
  if (localityDiffers(base, other)) out.push("different-locality");
  if (!other.matured) out.push("not-matured");
  return out;
}

/**
 * 並べる順。
 *
 * 1. いま組める個体を先に (後食していない個体は待つしかない)
 * 2. 血が遠いほうを先に。累代障害を避けるのが既定の勧め方
 * 3. 産地が揃っているほうを先に
 * 4. 種親としての成績 (その血から出た最大個体) が大きいほうを先に
 * 5. その個体自身の体長が大きいほうを先に
 *
 * 血が近い組み合わせも消さずに残す。兄妹掛けは形を固める正当なやり方なので、
 * 選べないと困る。上に出さないだけにしてある。
 */
export function byPairing(a: Candidate, b: Candidate): number {
  if (a.ready !== b.ready) return a.ready ? -1 : 1;

  const dist = bloodDistance(b.relation) - bloodDistance(a.relation);
  if (dist !== 0) return dist;

  const aMixed = a.cautions.includes("different-locality");
  const bMixed = b.cautions.includes("different-locality");
  if (aMixed !== bMixed) return aMixed ? 1 : -1;

  const best = compareDesc(a.bestOffspringMm, b.bestOffspringMm);
  if (best !== 0) return best;

  return compareDesc(a.beetle.sizeMm, b.beetle.sizeMm);
}

/** 大きい順。分かっていないものは後ろ */
function compareDesc(a?: number, b?: number): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return b - a;
}

/**
 * この個体に組める相手を、勧める順に並べて返す。
 * 性別が分からない個体を起点にしたときは空 (どちらを探せばよいか決まらない)
 */
export function pairingCandidates(
  base: Beetle,
  beetles: Beetle[],
  lines: BreedingLine[],
  larvae: Larva[]
): Candidate[] {
  if (base.gender === "unknown") return [];
  const want = base.gender === "male" ? "female" : "male";

  // 相手ごとの「種親としての成績」。ラインを引き直さずに済むよう先に索引を作る
  const bestByParent = new Map<string, number>();
  for (const r of lineResults(lines, larvae, beetles)) {
    if (r.bestSizeMm == null) continue;
    for (const id of [r.line.maleId, r.line.femaleId]) {
      if (!id) continue;
      const known = bestByParent.get(id);
      if (known == null || r.bestSizeMm > known) bestByParent.set(id, r.bestSizeMm);
    }
  }

  return beetles
    .filter(
      (b) =>
        b.id !== base.id &&
        b.gender === want &&
        b.isAlive &&
        b.soldPriceYen == null &&
        b.species === base.species
    )
    .map((b) => {
      const relation = relationOf(base, b, beetles, lines);
      return {
        beetle: b,
        relation,
        bestOffspringMm: bestByParent.get(b.id),
        cautions: cautionsFor(base, b, relation),
        ready: b.matured === true,
      };
    })
    .sort(byPairing);
}

/**
 * 次のライン名の候補。`2026-A` の形で、その年にまだ使っていない字を出す。
 * Z まで埋まっていたら年だけ返して、あとは手で付けてもらう
 */
export function suggestLineName(lines: BreedingLine[], year = new Date().getFullYear()): string {
  const used = new Set(lines.map((l) => l.name.trim()));
  for (let i = 0; i < 26; i++) {
    const name = `${year}-${String.fromCharCode(65 + i)}`;
    if (!used.has(name)) return name;
  }
  return `${year}-`;
}
