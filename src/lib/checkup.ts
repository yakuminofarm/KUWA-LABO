/**
 * 記録の点検。
 *
 * 名前を直す道具 (品種・管理系統・産地) をそろえても、**どれが直すべきものかは
 * 自分では気づけない**。「ニジイロ」と「ニジイロクワガタ」が両方あることに
 * 気づくのは、目安が分かれたり候補から漏れたりした後になる。
 *
 * 見つけたものを並べるだけで、**勝手には直さない**。似ているだけで別物のことが
 * あるため (「TD-」と「TD-A」は別の系統かもしれない)。
 */
import { Beetle, BreedingLine, Larva } from "@/types";
import { splitCode } from "@/lib/codeSeries";

export type FindingKind = "duplicate-code" | "species" | "series" | "locality";

export interface Finding {
  kind: FindingKind;
  /** 見つかったもの。2つ並ぶものは [古い方, 新しい方] とはかぎらない */
  values: string[];
  /** 関わっている記録の数 */
  count: number;
  /** どこで直せるか */
  where: string;
}

/**
 * 見た目のゆれを落として比べるための形。
 * 空白・中黒・ハイフンの種類・全角半角・大文字小文字をそろえる
 */
export function normalizeForCompare(raw: string): string {
  return raw
    .trim()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s・･,、]/g, "")
    .replace(/[-‐‑‒–—―ー－−]/g, "-")
    .toUpperCase();
}

/** 書き方が違うだけの組み合わせ (そろえたら同じになるもの) */
function sameShape(names: string[]): string[][] {
  const byShape = new Map<string, string[]>();
  for (const name of names) {
    const key = normalizeForCompare(name);
    if (key === "") continue;
    const list = byShape.get(key) ?? [];
    if (!list.includes(name)) list.push(name);
    byShape.set(key, list);
  }
  return [...byShape.values()].filter((list) => list.length > 1);
}

/** 片方がもう片方で始まるもの (「能勢YG」と「能勢YG血統」) */
function sharesHead(names: string[]): string[][] {
  const out: string[][] = [];
  const sorted = [...new Set(names)].sort((a, b) => a.length - b.length);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = normalizeForCompare(sorted[i]);
      const b = normalizeForCompare(sorted[j]);
      // 短すぎる頭は、たまたま合うだけのことが多い
      if (a.length >= 3 && b.startsWith(a) && a !== b) out.push([sorted[i], sorted[j]]);
    }
  }
  return out;
}

export function checkup(
  beetles: readonly Beetle[],
  larvae: readonly Larva[],
  lines: readonly BreedingLine[]
): Finding[] {
  const out: Finding[] = [];

  // ── 管理番号の重なり ──
  const byCode = new Map<string, number>();
  for (const b of beetles) {
    const code = b.code.trim();
    if (code) byCode.set(code, (byCode.get(code) ?? 0) + 1);
  }
  for (const [code, count] of byCode) {
    if (count > 1) {
      out.push({
        kind: "duplicate-code",
        values: [code],
        count,
        where: "成虫タブでその番号をさがして、どちらかを直してください",
      });
    }
  }

  // ── 品種の表記ゆれ ──
  const species = [...beetles, ...larvae, ...lines].map((x) => x.species);
  for (const values of [...sameShape(species), ...sharesHead([...new Set(species)])]) {
    out.push({
      kind: "species",
      values,
      count: species.filter((s) => values.includes(s)).length,
      where: "設定の「品種ごとの目安」で名前を直せます",
    });
  }

  // ── 管理系統の表記ゆれ ──
  const series = beetles
    .map((b) => splitCode(b.code)?.series)
    .filter((s): s is string => s != null && s !== "");
  for (const values of sameShape(series)) {
    out.push({
      kind: "series",
      values,
      count: series.filter((s) => values.includes(s)).length,
      where: "設定の「管理系統」で名前を直せます",
    });
  }

  // ── 産地の表記ゆれ (品種ごとに見る) ──
  const byLocalitySpecies = new Map<string, string[]>();
  for (const b of beetles) {
    const name = (b.locality ?? "").trim();
    if (!name) continue;
    const list = byLocalitySpecies.get(b.species) ?? [];
    list.push(name);
    byLocalitySpecies.set(b.species, list);
  }
  for (const [sp, list] of byLocalitySpecies) {
    for (const values of [...sameShape(list), ...sharesHead([...new Set(list)])]) {
      out.push({
        kind: "locality",
        values,
        count: list.filter((x) => values.includes(x)).length,
        where: `設定の「産地・血統」→ ${sp} で名前を直せます`,
      });
    }
  }

  return out;
}
