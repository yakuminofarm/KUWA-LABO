"use client";

import { useEffect } from "react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { feedingSummary, todayStr } from "@/lib/breeding";
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
 * 設定時刻をすぎて未給餌が残っていれば一度だけ知らせる。
 * ブラウザだけで動くため、アプリを開いている間しか発火できない
 * (閉じている間の通知には Push サーバーが必要)。
 */
export function FeedingReminder() {
  const enabled = useKuwagataStore((s) => s.reminder.enabled);
  const time = useKuwagataStore((s) => s.reminder.time);
  const { showToast } = useToast();

  useEffect(() => {
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

  return null;
}
