/**
 * 控え (バックアップ) の催促。
 *
 * 記録は端末の中にしかない。**アプリが消えれば記録も消える。**
 * iOS は使っていないアプリを勝手に取り除くことがあるし、開発中の版は署名の
 * 期限が切れる。開けなくなってからでは控えを取れないので、ふだんから促す。
 *
 * ただし、**始めたばかりの人には出さない**。数件の記録で毎回うるさく言われると、
 * 本当に大事になったときに読み飛ばされる。
 */
import { daysBetween } from "@/lib/breeding";

/** これだけ記録がたまったら促しはじめる */
export const NUDGE_MIN_RECORDS = 5;
/** 前の控えからこれだけ経ったら促す */
export const NUDGE_DAYS = 14;
/** ここまで経ったら、色を変えて強く促す */
export const NUDGE_DAYS_HARD = 45;
/** 1度も書き出していない人に、強く促しはじめる記録数 */
export const NUDGE_RECORDS_HARD = 20;

export interface BackupNudge {
  /** none = 出さない / soft = そっと / hard = 色を変えて */
  level: "none" | "soft" | "hard";
  /** 前の控えからの日数。1度も書き出していなければ null */
  days: number | null;
  records: number;
}

export function backupNudge(records: number, lastBackupAt?: string): BackupNudge {
  const days = lastBackupAt ? daysBetween(lastBackupAt) : null;
  const quiet: BackupNudge = { level: "none", days, records };
  if (records < NUDGE_MIN_RECORDS) return quiet;

  if (days == null) {
    // 1度も書き出していない。記録がたまるほど、失うものが大きい
    return { level: records >= NUDGE_RECORDS_HARD ? "hard" : "soft", days, records };
  }
  if (days >= NUDGE_DAYS_HARD) return { level: "hard", days, records };
  if (days >= NUDGE_DAYS) return { level: "soft", days, records };
  return quiet;
}

/** 催促の一言。**何件が、何日ぶん控えに入っていないか**を出す */
export function nudgeText(n: BackupNudge): string {
  if (n.days == null) return `${n.records}件の記録が、まだ控えに入っていません`;
  return `${n.records}件の記録。控えを書き出してから${n.days}日たちました`;
}
