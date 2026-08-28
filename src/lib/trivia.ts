/**
 * ホーム見出しの下に出す一言。
 * 記念日は実在が確かめられたものだけ (6/4 虫の日)。それ以外の日は、
 * クワガタの生態・名前の由来などの雑学を日付で機械的に回す。
 * 「世界一」「日本一」のような記録は、出典によって数字や対象種が
 * 割れやすいので避け、確かめられる範囲の言い方に留めている。
 *
 * 出典 (2026年8月に検索して確認):
 * - 虫の日 (6/4): 日本昆虫クラブが1988年に制定。「6=む・4=し」の語呂合わせ
 *   https://hoiku-is.jp/article/detail/2143/
 *   https://bestcalendar.jp/articles/2532
 * - 和名「クワガタ」の由来 (兜の鍬形): pixiv百科事典、コトバンク
 *   https://dic.pixiv.net/a/%E3%82%AF%E3%83%AF%E3%82%AC%E3%82%BF%E3%83%A0%E3%82%B7
 * - 英名 stag beetle の由来 (鹿の角に似た大顎):
 *   https://ejje.weblio.jp/content/%E3%82%AF%E3%83%AF%E3%82%AC%E3%82%BF
 * - ギラファノコギリクワガタが世界最大級 (最大120mm前後):
 *   https://ja.wikipedia.org/wiki/%E3%82%AE%E3%83%A9%E3%83%95%E3%82%A1%E3%83%8E%E3%82%B3%E3%82%AE%E3%83%AA%E3%82%AF%E3%83%AF%E3%82%AC%E3%82%BF
 * - ミヤマクワガタは低温性、大型化には低めの温度が効くこと:
 *   アプリ内の記事 (温度管理・大型づくり) にすでに出典つきで記載ずみ
 */

interface TriviaItem {
  /** "MM-DD" ならその日だけ、無ければ通常のプールから回す */
  date?: string;
  text: string;
}

const DATED: TriviaItem[] = [
  { date: "06-04", text: "今日 6月4日は「虫の日」。「6=む・4=し」の語呂合わせから" },
];

const POOL: TriviaItem[] = [
  { text: "和名「クワガタ」は、兜についた角のような飾り「鍬形」に似ていることから" },
  { text: "英語では stag beetle (鹿の甲虫)。大顎が鹿の角に似ていることから" },
  { text: "世界最大級はギラファノコギリクワガタ。体長は120mm近くになる" },
  { text: "クワガタは卵→幼虫→蛹→成虫と姿を変える「完全変態」の昆虫" },
  { text: "幼虫は朽木や腐葉土を食べて育つ。成虫になると樹液やゼリーしか口にしない" },
  { text: "大きなアゴを持つのはほぼオスだけ。良い樹液場やメスをめぐる争いに使う" },
  { text: "多くのクワガタは夜行性。昼間は樹のうろや土の中でじっとしている" },
  { text: "ミヤマクワガタは低温を好む種類。20℃を超えると弱りやすい" },
  { text: "大きく育てるコツは涼しめの温度。幼虫期間が延びるぶん体も大きくなる" },
  { text: "オオクワガタは成虫のまま数年生きることがある。短命な種との差が大きい" },
];

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

/** 今日の一言。記念日があればそれを優先し、無ければ雑学プールを日付で回す */
export function dailyTrivia(today: Date = new Date()): string {
  const md = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const dated = DATED.find((t) => t.date === md);
  if (dated) return dated.text;
  return POOL[dayOfYear(today) % POOL.length].text;
}
