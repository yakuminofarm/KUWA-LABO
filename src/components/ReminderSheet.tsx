"use client";

import { useSyncExternalStore } from "react";
import { Bell, BellOff, Smartphone } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { Sheet } from "@/components/KuwaUI";
import { useToast } from "@/components/ui/Toast";

type Perm = "default" | "granted" | "denied" | "unsupported";

/** 許可状態は購読できないので、こちらから変化を知らせるイベント */
const PERM_EVENT = "kuwa-notification-permission";

function subscribePermission(onChange: () => void) {
  window.addEventListener(PERM_EVENT, onChange);
  return () => window.removeEventListener(PERM_EVENT, onChange);
}

function readPermission(): Perm {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission as Perm;
}

export function ReminderSheet({ onClose }: { onClose: () => void }) {
  const { reminder, setReminder } = useKuwagataStore();
  const { showToast } = useToast();
  // サーバー側では判定できないので unsupported を初期値にする
  const perm = useSyncExternalStore<Perm>(
    subscribePermission,
    readPermission,
    () => "unsupported"
  );

  const requestPermission = async () => {
    if (!("Notification" in window)) return;
    const res = await Notification.requestPermission();
    window.dispatchEvent(new Event(PERM_EVENT));
    if (res === "granted") {
      showToast("通知をオンにしました");
      new Notification("くわらぼ", { body: "この形でお知らせします" });
    } else if (res === "denied") {
      showToast("通知はブラウザの設定から許可できます");
    }
  };

  return (
    <Sheet title="エサやりのお知らせ" onClose={onClose}>
      {/* オン/オフ */}
      <button
        onClick={() => setReminder({ enabled: !reminder.enabled })}
        className="w-full rounded-2xl px-4 py-4 flex items-center gap-3.5 active:scale-[0.98] transition-all"
        style={
          reminder.enabled
            ? { background: "var(--kuwa-amber-soft)", border: "1px solid rgba(163,102,15,0.3)" }
            : { background: "var(--kuwa-card)", border: "1px solid var(--kuwa-line)" }
        }
      >
        <span
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={
            reminder.enabled
              ? { background: "var(--kuwa-amber)", color: "#fdf6e7" }
              : { background: "var(--kuwa-bark-bg)", color: "var(--kuwa-ink-soft)" }
          }
        >
          {reminder.enabled ? (
            <Bell className="w-5 h-5" strokeWidth={2.2} />
          ) : (
            <BellOff className="w-5 h-5" strokeWidth={2.2} />
          )}
        </span>
        <div className="min-w-0 flex-1 text-left">
          <p className="font-maru text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
            {reminder.enabled ? "お知らせオン" : "お知らせオフ"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--kuwa-ink-soft)" }}>
            決めた時刻をすぎて未完了なら教えてくれます
          </p>
        </div>
      </button>

      {/* 時刻 */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--kuwa-ink)" }}>
          お知らせの時刻
        </label>
        <input
          type="time"
          value={reminder.time}
          onChange={(e) => setReminder({ time: e.target.value })}
          className="kuwa-input"
          style={{ fontVariantNumeric: "tabular-nums" }}
        />
      </div>

      {/* 通知の許可 */}
      {reminder.enabled && (
        <div
          className="rounded-2xl p-4"
          style={{ background: "var(--kuwa-card)", border: "1px solid var(--kuwa-line)" }}
        >
          <p className="font-maru text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
            端末の通知
          </p>
          <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
            {perm === "granted"
              ? "許可ずみです。アプリを開いている間、時刻になるとバナーでお知らせします。"
              : perm === "denied"
              ? "ブロックされています。ブラウザのサイト設定から許可すると使えます。"
              : perm === "unsupported"
              ? "このブラウザは通知に対応していません。アプリ内のメッセージでお知らせします。"
              : "許可すると、アプリを開いている間にバナーで通知できます。"}
          </p>
          {perm === "default" && (
            <button
              onClick={requestPermission}
              className="kuwa-btn-primary w-full mt-3 py-3 text-sm active:scale-[0.98] transition-all"
            >
              通知を許可する
            </button>
          )}
        </div>
      )}

      {/* 制約の説明 */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--kuwa-bark-bg)", border: "1px solid var(--kuwa-line)" }}
      >
        <p className="font-maru text-sm font-bold flex items-center gap-2" style={{ color: "var(--kuwa-bark)" }}>
          <Smartphone className="w-4 h-4" strokeWidth={2.2} />
          知っておいてほしいこと
        </p>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
          このアプリはブラウザだけで動いているため、
          <strong style={{ color: "var(--kuwa-ink)" }}>アプリを閉じている間の通知は出せません</strong>。
          時刻になったら鳴る目覚ましが必要な場合は、iPhoneの「ショートカット」アプリで
          毎日この時刻にくわらぼを開く自動化を作るのが確実です。
        </p>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
          ショートカット → オートメーション → 時刻 → 毎日{reminder.time} → 「Appを開く」または
          「通知を表示」を選ぶだけで設定できます。
        </p>
      </div>
    </Sheet>
  );
}
