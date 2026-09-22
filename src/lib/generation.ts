/**
 * 累代 (WD / WF1 / CBF2 …) の読み書き。
 *
 * これまでは自由入力だった。打つのが面倒なうえ、「CBF2」「cbf2」「CB F2」が
 * 別物として並んでしまう。選んで決められるように、書き方を型に分ける。
 *
 * ただし**読めなかった文字は消さない**。人によって流儀があり、
 * 「CB」「F2 (自己ブリード)」のような書き方も実際に使われている。
 */

export type GenKind = "unknown" | "wd" | "wf" | "cb" | "f" | "free";

export interface GenValue {
  kind: GenKind;
  /** wf / cb / f のときの代数 */
  n?: number;
  /** free のときの、打たれたままの文字 */
  text?: string;
}

/** 代数の選択肢。ここまでで足りなければ「自分で書く」に逃がす */
export const GEN_MAX = 20;

export function parseGeneration(raw: string | undefined): GenValue {
  const text = (raw ?? "").trim();
  if (!text) return { kind: "unknown" };

  const g = text.toUpperCase().replace(/\s+/g, "");
  if (g === "WD" || g === "WILD") return { kind: "wd" };

  const m = /^(WF|CBF|CB|F)(\d+)$/.exec(g);
  if (m) {
    const n = parseInt(m[2], 10);
    // CB だけ数字なしの書き方もあるので、0 は型に当てはめない
    if (n >= 1) {
      const kind = m[1] === "WF" ? "wf" : m[1] === "F" ? "f" : "cb";
      return { kind, n };
    }
  }
  return { kind: "free", text };
}

export function formatGeneration(v: GenValue): string {
  switch (v.kind) {
    case "unknown":
      return "";
    case "wd":
      return "WD";
    case "wf":
      return `WF${v.n ?? 1}`;
    // 保存する形は CBF に揃える。手元の記録も、親から引き継ぐ計算も CBF で
    // 書かれているため
    case "cb":
      return `CBF${v.n ?? 1}`;
    case "f":
      return `F${v.n ?? 1}`;
    case "free":
      return (v.text ?? "").trim();
  }
}

/** 代数を選ぶときの数字。いまの値がここを超えていても選び直せるようにする */
export function generationNumbers(current?: number): number[] {
  const max = Math.max(GEN_MAX, current ?? 0);
  return Array.from({ length: max }, (_, i) => i + 1);
}

/** 代数を持つ区分か (WD と不明は代数を持たない) */
export function hasNumber(kind: GenKind): boolean {
  return kind === "wf" || kind === "cb" || kind === "f";
}
