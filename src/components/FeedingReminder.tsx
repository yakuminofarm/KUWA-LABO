"use client";

import { useEffect } from "react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { feedingSummary, planFeedingNotices, todayStr } from "@/lib/breeding";
import { IS_NATIVE } from "@/lib/env";
import { syncFeedingNotices } from "@/lib/notify";
import { useToast } from "@/components/ui/Toast";

const NOTIFIED_KEY = "kuwa-fed-notified-on";

/** "HH:MM" を過ぎているか */
function isPastTime(time: string, now = new Date()): boolean {
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  return now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
}

function readNotifiedOn(): string | null {
  try {
    return localStorage.getItem(NOTIFIED_KEY);
  } catch {
    return null;
  }
}

function writeNotifiedOn(day: string) {
  try {
    localStorage.setItem(NOTIFIED_KEY, day);
  } catch {
    /* 保存できなくても通知自体は出す */
  }
}

/**
 * エサやりの時間を知らせる。出し先によってやり方が違う。
 *
 * - ブラウザ版: 画面が開いている間だけ見張り、時刻を過ぎていて未給餌が
 *   残っていれば1回だけ知らせる。閉じている間は鳴らせない
 * - アプリ版: 閉じていても鳴らしたいので、先の予定を端末に積んでおく。
 *   記録や設定が変わるたびに積み直して、実態とずれないようにする
 *
 * どちらを使うかはビルド時に決まる。使わない側は出来上がりに残らない。
 */
export function FeedingReminder() {
  const enabled = useKuwagataStore((s) => s.reminder.enabled);
  const time = useKuwagataStore((s) => s.reminder.time);
  const intervalDays = useKuwagataStore((s) => s.reminder.intervalDays);
  const beetles = useKuwagataStore((s) => s.beetles);
  const { showToast } = useToast();

  // ── ブラウザ版: 開いている間だけ見張る ──────────────
  useEffect(() => {
    if (IS_NATIVE) return;
    if (!enabled) return;

    const check = () => {
      const today = todayStr();
      if (readNotifiedOn() === today) return;
      if (!isPastTime(time)) return;

      // 最新の一覧はストアから直接読む (レンダー中に ref を触らないため)
      const { beetles, reminder: r } = useKuwagataStore.getState();
      const { pending } = feedingSummary(beetles, r.intervalDays, today);
      if (pending.length === 0) return;

      writeNotifiedOn(today);
      const body = `まだ ${pending.length}頭 にエサをあげていません`;

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification("くわらぼ｜エサやりの時間です", { body, tag: "kuwa-feeding" });
        } catch {
          /* 通知が出せない環境ではトーストのみ */
        }
      }
      showToast(`エサやりの時間です。${body}`);
    };

    check();
    const id = window.setInterval(check, 30_000);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, time, showToast]);

  // ── アプリ版: 先の予定を端末に積み直す ──────────────
  useEffect(() => {
    if (!IS_NATIVE) return;

    // 記録を1つ直すたびに積み直すと、続けて触ったぶんだけ端末を呼ぶ。
    // 手が止まってからまとめて1回にする
    let timer: number | undefined;
    const restack = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const { beetles, reminder } = useKuwagataStore.getState();
        void syncFeedingNotices(planFeedingNotices(beetles, reminder));
      }, 800);
    };

    restack();
    // 日をまたいでから開き直すと、積んである予定はもう古い。
    // 戻ってきたところで作り直す
    const onVisible = () => document.visibilityState === "visible" && restack();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // 記録と設定のどちらが動いても積み直す
  }, [enabled, time, intervalDays, beetles]);

  return null;
}
