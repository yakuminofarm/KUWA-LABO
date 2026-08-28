import { NewsItem } from "@/lib/newsFeed";

/**
 * ホームで見せるニュースを1件だけ取ってくる。
 * 電波が悪い・取得先が落ちているなど、うまくいかない理由はいろいろあるので、
 * 失敗の種類を区別せず null を返すだけにする。呼び出し側は雑学に切り替える。
 */
export async function fetchTodayNews(): Promise<NewsItem | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch("/api/news", { signal: controller.signal });
    if (!res.ok) return null;
    const data: { items?: NewsItem[] } = await res.json();
    return data.items?.[0] ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
