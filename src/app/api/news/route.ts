import { NEWS_FEED_URL, parseNewsFeed } from "@/lib/newsFeed";

/**
 * クワガタ関連のニュース見出しを何件か返す。
 *
 * このアプリはこれまで「サーバーには何も送らない」設計だったが、ここだけは例外。
 * ただし送る内容は固定の検索キーワードだけで、飼育記録など個人のデータは
 * 一切ふくまれない (詳しくは README を参照)。
 *
 * 取得先が落ちていても、記事が0件でもホームの表示は壊さない。
 * 失敗時も 200 で items:[] を返し、呼び出し側 (ホーム画面) が
 * その場で雑学の一言に切り替えられるようにしている。
 */
export async function GET() {
  try {
    const res = await fetch(NEWS_FEED_URL, {
      // 毎回のホーム表示ごとに取りに行くと負担が大きいので、しばらく使い回す
      next: { revalidate: 21600 }, // 6時間
      headers: { "User-Agent": "kuwarabo/1.0 (+https://kuwa-labo.vercel.app)" },
    });
    if (!res.ok) return Response.json({ items: [] });

    const xml = await res.text();
    const items = parseNewsFeed(xml).slice(0, 8);
    return Response.json({ items });
  } catch {
    return Response.json({ items: [] });
  }
}
