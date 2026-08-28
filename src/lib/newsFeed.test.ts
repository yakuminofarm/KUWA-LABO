import { describe, expect, it } from "vitest";
import { parseNewsFeed, stripSourceSuffix } from "@/lib/newsFeed";

const SAMPLE_TWO_ITEMS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>"クワガタ" - Google ニュース</title>
    <link>https://news.google.com/</link>
    <language>ja</language>
    <item>
      <title>珍しいクワガタが見つかる - 地元新聞</title>
      <link>https://news.google.com/rss/articles/AAAA?oc=5</link>
      <guid isPermaLink="false">AAAA</guid>
      <pubDate>Thu, 27 Aug 2026 08:00:00 GMT</pubDate>
      <description>&lt;a href="...">珍しいクワガタが見つかる&lt;/a>&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f">地元新聞&lt;/font></description>
      <source url="https://example.com">地元新聞</source>
    </item>
    <item>
      <title>クワガタ採集イベント開催</title>
      <link>https://news.google.com/rss/articles/BBBB?oc=5</link>
      <guid isPermaLink="false">BBBB</guid>
      <pubDate>Wed, 26 Aug 2026 03:00:00 GMT</pubDate>
      <description>...</description>
    </item>
  </channel>
</rss>`;

const SAMPLE_ONE_ITEM = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>"クワガタ" - Google ニュース</title>
    <item>
      <title>クワガタの新種を確認 - 研究機関</title>
      <link>https://news.google.com/rss/articles/CCCC?oc=5</link>
      <pubDate>Fri, 28 Aug 2026 01:00:00 GMT</pubDate>
      <source url="https://example.org">研究機関</source>
    </item>
  </channel>
</rss>`;

describe("stripSourceSuffix", () => {
  it("末尾が発行元名と一致していれば削る", () => {
    expect(stripSourceSuffix("珍しいクワガタが見つかる - 地元新聞", "地元新聞")).toBe(
      "珍しいクワガタが見つかる"
    );
  });

  it("発行元が無い・一致しなければそのまま返す", () => {
    expect(stripSourceSuffix("クワガタ採集イベント開催", undefined)).toBe(
      "クワガタ採集イベント開催"
    );
    expect(stripSourceSuffix("クワガタ採集イベント開催", "別の発行元")).toBe(
      "クワガタ採集イベント開催"
    );
  });
});

describe("parseNewsFeed", () => {
  it("複数件のとき、それぞれタイトル・リンク・発行元を取り出す", () => {
    const items = parseNewsFeed(SAMPLE_TWO_ITEMS);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: "珍しいクワガタが見つかる",
      link: "https://news.google.com/rss/articles/AAAA?oc=5",
      source: "地元新聞",
    });
    // source タグが無い記事は、末尾を削らずタイトルそのまま
    expect(items[1]).toMatchObject({
      title: "クワガタ採集イベント開催",
      source: undefined,
    });
  });

  it("1件だけのとき (XMLパーサーが配列でなくオブジェクトを返す場合) も正しく扱う", () => {
    const items = parseNewsFeed(SAMPLE_ONE_ITEM);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("クワガタの新種を確認");
    expect(items[0].source).toBe("研究機関");
  });

  it("記事が無いフィードは空配列を返す (例外を投げない)", () => {
    const empty = `<rss version="2.0"><channel><title>test</title></channel></rss>`;
    expect(parseNewsFeed(empty)).toEqual([]);
  });

  it("壊れたXMLでも例外を投げずに空配列を返す", () => {
    expect(parseNewsFeed("これはXMLではありません")).toEqual([]);
  });
});
