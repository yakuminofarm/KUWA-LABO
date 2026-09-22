/**
 * 管理番号の下書き。
 *
 * 番号の付け方は人それぞれ (25OK-A1 / No.7 / 久留米-3…) なので、
 * こちらから型を決めない。**その人がすでに打った番号を種にして続きを出す**。
 */

/** "26OK-A1" → "26OK-A2"。すでにある番号は飛ばす。数字が無ければ空にする */
export function nextCode(code: string, existing: readonly string[]): string {
  const m = code.match(/^(.*?)(\d+)$/);
  if (!m) return "";
  const [, head, digits] = m;
  const taken = new Set(existing);
  for (let n = parseInt(digits, 10) + 1; n < parseInt(digits, 10) + 200; n++) {
    // 元が "01" なら "02" になるよう桁を保つ
    const candidate = head + String(n).padStart(digits.length, "0");
    if (!taken.has(candidate)) return candidate;
  }
  return "";
}

/**
 * これから登録する個体の管理番号を下書きする。
 *
 * **同じ品種で最後に登録した番号の続きだけを出す。** 品種ごとに記号を
 * 変えている人 (25OK-… / 25PH-…) に別の品種の続きを出すと、気づかずに
 * 通し番号を取り違えるため。
 *
 * 通しで振っている人 (No.1, No.2…) にも効く。同じ品種の最後が古くても、
 * nextCode が埋まっている番号を飛ばして空いているところまで進めてくれる。
 */
export function suggestCode(
  beetles: readonly { code: string; species: string }[],
  species: string
): string {
  const sameSpecies = beetles.filter((b) => b.species === species);
  const base = sameSpecies[sameSpecies.length - 1];
  if (!base) return "";
  return nextCode(base.code, beetles.map((b) => b.code));
}
