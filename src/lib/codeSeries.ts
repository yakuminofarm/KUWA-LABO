/**
 * 管理番号を「系統」と「番号」に分けて扱う。
 *
 * 25OK-A3 の "25OK-A" が系統、"3" が番号。系統は一度決めたらしばらく変わらない
 * ので、選んで呼び出せるようにし、打つのは番号だけにする。
 *
 * **記録の中では、これまでどおり1つの文字のまま持つ。** ラベルも QR も CSV も
 * 血統書も管理番号を1つの文字として扱っているので、そこを分けると全部に響く。
 */

import { nextCode } from "@/lib/beetleCode";

export const SERIES_MAX = 20;

/**
 * 末尾の数字を番号、その手前を系統として切り分ける。
 * 末尾が数字でなければ分けられない (「オオクワ♂」のような番号もある)。
 */
export function splitCode(code: string): { series: string; number: string } | null {
  const m = code.match(/^(.*?)(\d+)$/);
  return m ? { series: m[1], number: m[2] } : null;
}

export function joinCode(series: string, number: string): string {
  return `${series}${number}`;
}

/**
 * 打っている途中の2つの欄から、管理番号を組み立てる。
 *
 * **番号が空のあいだは、管理番号もまだできていない扱いにする。**
 * 系統だけを管理番号にすると「TD-」のような番号で登録できてしまううえ、
 * それは系統と番号に分け直せないので、次に開いたときに系統の欄まで空に見える。
 */
export function codeFromParts(series: string, number: string): string {
  return number === "" ? "" : joinCode(series, number);
}

/** 記号を付けず 1, 2, 3… と振っている人の系統。選ぶときはこう出す */
export const NO_SERIES_LABEL = "(記号なし)";

export function seriesLabel(series: string): string {
  return series === "" ? NO_SERIES_LABEL : series;
}

/**
 * 選べる系統。**使ったことのあるものが先、新しく使ったものほど上**。
 * そのあとに、まだ記録の無い「登録しただけ」の系統が並ぶ。
 */
export function knownSeries(
  beetles: readonly { code: string }[],
  registered: readonly string[] = []
): string[] {
  const lastUsed = new Map<string, number>();
  beetles.forEach((b, i) => {
    const s = splitCode(b.code)?.series;
    if (s != null) lastUsed.set(s, i);
  });
  const used = [...lastUsed.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  return [...used, ...registered.filter((s) => !lastUsed.has(s))];
}

/** その系統で、まだ使われていない次の番号。桁は前のものに合わせる */
export function nextNumberIn(series: string, beetles: readonly { code: string }[]): string {
  const inSeries = beetles.filter((b) => splitCode(b.code)?.series === series);
  const last = inSeries[inSeries.length - 1];
  if (!last) return "1";
  const next = nextCode(last.code, beetles.map((b) => b.code));
  return splitCode(next)?.number ?? "1";
}

/**
 * その系統で選べる番号。**すでに使われている番号は出さない。**
 *
 * 1 から「いちばん大きい番号 + 10」までを並べ、埋まっているものを落とす。
 * 途中が抜けている (消した子の番号) ときは、その番号も選べる。
 * 桁は、その系統でいま使っている書き方に合わせる (01 なら 02, 03…)。
 */
export function numberOptions(
  series: string,
  beetles: readonly { code: string }[],
  own?: string
): string[] {
  const taken = new Set<string>();
  let width = 1;
  let max = 0;
  for (const b of beetles) {
    const p = splitCode(b.code);
    if (!p || p.series !== series) continue;
    taken.add(p.number);
    width = p.number.length;
    max = Math.max(max, parseInt(p.number, 10));
  }

  const out: string[] = [];
  for (let n = 1; n <= max + 10; n++) {
    const s = String(n).padStart(width, "0");
    // 直しに来た本人の番号は、埋まっていても選べる
    if (!taken.has(s) || s === own) out.push(s);
  }
  // 桁の違う番号で直しに来たときのために、本人のぶんは必ず入れる
  if (own != null && own !== "" && !out.includes(own)) {
    out.push(own);
    out.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }
  return out;
}

/** その系統を使っている記録があるか (登録一覧から外せるかの判断) */
export function seriesInUse(series: string, beetles: readonly { code: string }[]): boolean {
  return beetles.some((b) => splitCode(b.code)?.series === series);
}

export type SeriesIssue = "empty" | "too-long" | "ends-with-digit" | "duplicate";

export function checkSeriesName(
  raw: string,
  known: readonly string[]
): { name: string } | { issue: SeriesIssue } {
  const name = raw.trim();
  if (name === "") return { issue: "empty" };
  if (name.length > SERIES_MAX) return { issue: "too-long" };
  // 系統の終わりが数字だと、番号と見分けがつかない。
  // "25" + "3" は "253" になり、読み直すと系統なしの253番になってしまう
  if (/\d$/.test(name)) return { issue: "ends-with-digit" };
  if (known.includes(name)) return { issue: "duplicate" };
  return { name };
}
