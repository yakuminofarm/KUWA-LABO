import { XMLParser } from "fast-xml-parser";

/** クワガタ関連のニュースを検索する Google News RSS (キー不要の公開エンドポイント) */
export const NEWS_FEED_URL =
  "https://news.google.com/rss/search?q=" +
  encodeURIComponent("クワガタ") +
  "&hl=ja&gl=JP&ceid=JP:ja";

export interface NewsItem {
  title: string;
  link: string;
  source?: string;
  pubDate?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

function textOf(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "#text" in v) {
    const t = (v as { "#text"?: unknown })["#text"];
    return typeof t === "string" ? t : undefined;
  }
  return undefined;
}

/**
 * Google News は見出しの末尾に "記事タイトル - 発行元" と付けてくる。
 * source タグと重複するので、一致していれば削る。
 */
export function stripSourceSuffix(title: string, source?: string): string {
  if (!source) return title;
  const suffix = ` - ${source}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length) : title;
}

/** Google News RSS の XML 文字列を、使う項目だけの配列にする */
export function parseNewsFeed(xml: string): NewsItem[] {
  const data = parser.parse(xml);
  const raw = data?.rss?.channel?.item;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];

  return list
    .map((item): NewsItem | null => {
      const title = textOf(item?.title);
      const link = textOf(item?.link);
      if (!title || !link) return null;
      const source = textOf(item?.source);
      return {
        title: stripSourceSuffix(title, source),
        link,
        source,
        pubDate: textOf(item?.pubDate),
      };
    })
    .filter((x): x is NewsItem => x != null);
}
