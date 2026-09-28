/**
 * エサやりの履歴。
 *
 * これまで残していたのは「最後にあげた日」だけだった。毎日押しているのに、
 * 押したそばから前の日が消えていたことになる。**あげた日を積んでおく。**
 *
 * 積むと「ちゃんとあげていたか」を後から見られるし、決めた間隔で回せて
 * いるのかも分かる。記録そのものは、押す手間を1回も増やさずに増える。
 */
import { Beetle } from "@/types";

/**
 * 残しておく日数の上限。
 * 毎日あげる人で1年ぶんを超える。これ以上は、古い順に落とす
 */
export const FED_HISTORY_MAX = 400;

/** 直近の様子を見る窓 */
export const RECENT_DAYS = 30;

/**
 * あげた日の一覧 (古い順)。
 *
 * 履歴を持つ前の記録には「最後にあげた日」しかないので、それを1日ぶんの
 * 履歴として読む。**古い記録を書き換えずに、読むときだけそろえる。**
 */
export function fedDatesOf(b: Pick<Beetle, "fedDates" | "lastFedDate">): string[] {
  if (b.fedDates && b.fedDates.length > 0) return b.fedDates;
  return b.lastFedDate ? [b.lastFedDate] : [];
}

/** 最後にあげた日 (履歴の末尾)。一度もあげていなければ undefined */
export function lastFed(dates: readonly string[]): string | undefined {
  return dates.length > 0 ? dates[dates.length - 1] : undefined;
}

/** その日のぶんを足す。すでにあれば何も変わらない */
export function withFed(
  b: Pick<Beetle, "fedDates" | "lastFedDate">,
  date: string
): Pick<Beetle, "fedDates" | "lastFedDate"> {
  const dates = fedDatesOf(b);
  if (dates.includes(date)) return { fedDates: dates, lastFedDate: lastFed(dates) };
  const next = [...dates, date].sort().slice(-FED_HISTORY_MAX);
  return { fedDates: next, lastFedDate: lastFed(next) };
}

/**
 * その日のぶんを外す (押し間違えの取り消し)。
 *
 * **最後にあげた日は、その前の日に戻す。** 消して「一度もあげていない」に
 * するのは、取り消しの結果として行きすぎている。
 */
export function withoutFed(
  b: Pick<Beetle, "fedDates" | "lastFedDate">,
  date: string
): Pick<Beetle, "fedDates" | "lastFedDate"> {
  const next = fedDatesOf(b).filter((d) => d !== date);
  return { fedDates: next.length > 0 ? next : undefined, lastFedDate: lastFed(next) };
}

export interface FeedingStats {
  /** 積んである日数 */
  total: number;
  /** 直近30日であげた回数 */
  recent: number;
  /** 直近であげた間隔の平均 (日)。2回ぶん無ければ null */
  averageDays: number | null;
}

/** 日付の差 (日)。どちらも YYYY-MM-DD */
function diffDays(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
}

export function feedingStats(dates: readonly string[], today: string): FeedingStats {
  const recentDates = dates.filter((d) => diffDays(d, today) < RECENT_DAYS && d <= today);
  const first = recentDates[0];
  const last = recentDates[recentDates.length - 1];
  return {
    total: dates.length,
    recent: recentDates.length,
    // 直近の様子だけで見る。何ヶ月も前の間隔を混ぜても、いまの調子は分からない
    averageDays:
      recentDates.length >= 2
        ? Math.round((diffDays(first, last) / (recentDates.length - 1)) * 10) / 10
        : null,
  };
}
