/**
 * 一覧の上にある「しぼりこみ」の要約。
 *
 * チップを畳むと画面は静かになるが、そのぶん「なぜこの件数なのか」が
 * 見えなくなる。閉じていても効いている条件だけは1行で見せるための文を作る。
 */

/** 選択肢の並び順のまま、効いているものの名前を返す */
export function activeLabels<K extends string>(
  options: readonly { key: K; label: string }[],
  active: ReadonlySet<K>
): string[] {
  return options.filter((o) => active.has(o.key)).map((o) => o.label);
}

/**
 * 「飼育中 ・ エサまだ / 新しい順」のような1行。
 *
 * 絞り込み (件数が変わるもの) と並べ方 (変わらないもの) を `/` で分ける。
 * 混ぜると、並べ方を変えただけで件数が減ったように見える。
 */
export function summaryLine(conditions: string[], view: string[] = []): string {
  const left = conditions.length === 0 ? "すべて" : conditions.join(" ・ ");
  return view.length === 0 ? left : `${left} / ${view.join(" ・ ")}`;
}

/** 「12頭を表示中」。単位は一覧ごとに違う (頭・ライン) */
export function countText(count: number, unit: string): string {
  return `${count}${unit}を表示中`;
}
