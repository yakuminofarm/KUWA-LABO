"use client";

import { useSyncExternalStore } from "react";
import { Bell, BellOff, Info, Smartphone } from "lucide-react";
import {
  DEFAULT_SCHEDULE,
  FEED_INTERVAL_OPTIONS,
  FOOD_OPTIONS,
  feedIntervalLabel,
} from "@/lib/breeding";
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
  const { reminder, setReminder, schedule, setSchedule } = useKuwagataStore();
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
    <Sheet title="設定" onClose={onClose}>
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

      {/* エサ替えの間隔 */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--kuwa-ink)" }}>
          エサ替えの間隔
        </label>
        <div className="flex flex-wrap gap-2">
          {FEED_INTERVAL_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setReminder({ intervalDays: d })}
              className="kuwa-chip"
              data-on={reminder.intervalDays === d}
            >
              {feedIntervalLabel(d)}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
          前回あげてからこの日数がたつと「エサまだ」になります。
          個体ごとに変えたいときは、その子の詳細から上書きできます。
        </p>
      </div>

      {/* ふだんの餌 */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--kuwa-ink)" }}>
          ふだん与えている餌
        </label>
        <div className="flex flex-wrap gap-2">
          {FOOD_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => setReminder({ foodType: f })}
              className="kuwa-chip"
              data-on={reminder.foodType === f}
            >
              {f}
            </button>
          ))}
        </div>
        <input
          value={reminder.foodType}
          onChange={(e) => setReminder({ foodType: e.target.value })}
          placeholder="自由に入力もできます"
          className="kuwa-input mt-2"
        />
        <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
          個体ごとに変えたいときは、その子の詳細から上書きできます。
        </p>
      </div>

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

      {/* 表示する画面。趣味で飼う人には売り買いの話が邪魔になる */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--kuwa-card)", border: "1px solid var(--kuwa-line)" }}
      >
        <p className="font-maru text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
          おかねの管理
        </p>
        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
          収支タブと販売の記録を使うかどうか。オフにすると、飼育の記録だけの
          すっきりした画面になります。入れた金額は消えないので、いつでも戻せます。
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setReminder({ showCost: true })}
            className="kuwa-chip flex-1"
            data-on={reminder.showCost}
          >
            使う
          </button>
          <button
            onClick={() => setReminder({ showCost: false })}
            className="kuwa-chip flex-1"
            data-on={!reminder.showCost}
          >
            使わない
          </button>
        </div>
      </div>

      {/* 育成の目安。飼育者ごとにやり方が違うので本人が決める */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--kuwa-card)", border: "1px solid var(--kuwa-line)" }}
      >
        <p className="font-maru text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
          育成の目安にする日数
        </p>
        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
          「そろそろ羽化」「掘り出しの目安」を出す基準です。種類・温度・やり方で
          変わるので、ご自身のやり方に合わせて変えてください。
        </p>

        <div className="mt-3.5 space-y-3">
          {(
            [
              { key: "pupaDaysMin", label: "蛹化から羽化まで (最短)", unit: "日" },
              { key: "pupaDaysMax", label: "蛹化から羽化まで (最長)", unit: "日" },
              { key: "digOutDays", label: "羽化から掘り出しまで", unit: "日" },
              { key: "bottleChangeDays", label: "ビン交換の間隔", unit: "日" },
            ] as const
          ).map(({ key, label, unit }) => (
            <div key={key} className="flex items-center gap-3">
              <label className="text-xs flex-1 min-w-0" style={{ color: "var(--kuwa-ink)" }}>
                {label}
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={schedule[key]}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (Number.isFinite(n) && n > 0) setSchedule({ [key]: n });
                }}
                className="kuwa-input w-24 text-right"
                style={{ fontVariantNumeric: "tabular-nums" }}
              />
              <span className="text-xs flex-shrink-0" style={{ color: "var(--kuwa-ink-soft)" }}>
                {unit}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setSchedule(DEFAULT_SCHEDULE)}
          className="kuwa-btn-ghost w-full mt-3.5 py-2.5 text-xs active:scale-[0.98] transition-all"
        >
          はじめの値に戻す
        </button>
      </div>

      {/* このアプリの助言について。個体を預かる以上、黙って断定しない */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--kuwa-bark-bg)", border: "1px solid var(--kuwa-line)" }}
      >
        <p
          className="font-maru text-sm font-bold flex items-center gap-2"
          style={{ color: "var(--kuwa-bark)" }}
        >
          <Info className="w-4 h-4" strokeWidth={2.2} />
          目安の数字について
        </p>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
          このアプリが出す日数の目安や読みものは、
          <strong style={{ color: "var(--kuwa-ink)" }}>AIがまとめたもの</strong>
          で、正しさを保証できるものではありません。種類・産地・温度・
          菌糸の銘柄などで実際は大きく変わります。
        </p>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
          大切な個体のことは、
          <strong style={{ color: "var(--kuwa-ink)" }}>ご自身の観察と信頼できる情報源で判断してください</strong>
          。迷ったときは待つほうが安全です。掘り出しを早まると体が固まる前に
          傷めることがあります。
        </p>
      </div>

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
