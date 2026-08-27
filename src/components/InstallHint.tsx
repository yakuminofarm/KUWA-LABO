"use client";

import { useSyncExternalStore } from "react";
import { X } from "lucide-react";

/**
 * ホーム画面への追加を案内する。
 *
 * iPhone は Safari の共有メニューからしか追加できず、Chrome などで開いていると
 * 項目自体が出てこない。ここでつまずくと「使えないアプリ」で終わってしまうので、
 * 開いているブラウザに合わせて出し分ける。
 *
 * 判定にはブラウザ側の情報が要るので、描画の外にある値として
 * useSyncExternalStore で読む。サーバー側では判定しようがないため "hidden" を返す。
 */
type Mode = "hidden" | "ios-safari" | "ios-other" | "installable";

const DISMISS_KEY = "kuwa-install-hint-dismissed";

/** Android などが出す、インストールを申し出るイベント */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let promptEvent: InstallPromptEvent | null = null;
let cached: Mode | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function detect(): Mode {
  try {
    if (localStorage.getItem(DISMISS_KEY)) return "hidden";
  } catch {
    // プライベートブラウズなどで読めなくても案内は出す
  }

  const nav = navigator as Navigator & { standalone?: boolean };
  // すでにホーム画面から開いていれば用はない
  if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true) {
    return "hidden";
  }

  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS は Mac を名乗るのでタッチの有無で見分ける
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIOS) {
    // iOS版の Chrome / Firefox / Edge には「ホーム画面に追加」が無い
    return /CriOS|FxiOS|EdgiOS|OPT\//.test(ua) ? "ios-other" : "ios-safari";
  }
  // Android などは、ブラウザが申し出てきたときだけ案内する
  return promptEvent ? "installable" : "hidden";
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onPrompt = (e: Event) => {
    e.preventDefault(); // 既定の案内を止めて、こちらのボタンから出す
    promptEvent = e as InstallPromptEvent;
    cached = detect();
    emit();
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("beforeinstallprompt", onPrompt);
  };
}

function getSnapshot(): Mode {
  if (cached === null) cached = detect();
  return cached;
}

/** iOSの共有ボタン (□に↑)。文字で書くより絵のほうが早く伝わる */
function ShareGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 inline-block align-[-3px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

export function InstallHint() {
  const mode = useSyncExternalStore<Mode>(subscribe, getSnapshot, () => "hidden");

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // 保存できなくても、この場では閉じる
    }
    cached = "hidden";
    emit();
  };

  if (mode === "hidden") return null;

  return (
    <div
      className="rounded-2xl p-4 relative"
      style={{ background: "var(--kuwa-amber-soft)", border: "1px solid rgba(163,102,15,0.3)" }}
    >
      <button
        onClick={dismiss}
        aria-label="この案内を閉じる"
        className="absolute top-2.5 right-2.5 p-1.5 rounded-full active:scale-90 transition-all"
        style={{ color: "#8a5410" }}
      >
        <X className="w-4 h-4" strokeWidth={2.4} />
      </button>

      <p className="font-maru text-sm font-bold pr-8" style={{ color: "var(--kuwa-ink)" }}>
        ホーム画面に置くと使いやすくなります
      </p>

      {mode === "ios-safari" && (
        <>
          <p className="text-xs mt-2 leading-relaxed" style={{ color: "#8a5410" }}>
            画面下の <ShareGlyph /> を押して、
            <strong style={{ color: "var(--kuwa-ink)" }}>「ホーム画面に追加」</strong>
            を選び、右上の「追加」を押してください。
          </p>
          <p className="text-[11px] mt-2 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
            アドレスバーが消えて全画面になり、電波がなくても開けるようになります。
          </p>
        </>
      )}

      {mode === "ios-other" && (
        <p className="text-xs mt-2 leading-relaxed" style={{ color: "#8a5410" }}>
          いまのブラウザには、ホーム画面へ追加する機能がありません。
          <strong style={{ color: "var(--kuwa-ink)" }}>Safari で開き直す</strong>
          と、共有ボタンから追加できます。
        </p>
      )}

      {mode === "installable" && (
        <>
          <p className="text-xs mt-2 leading-relaxed" style={{ color: "#8a5410" }}>
            アプリとして入れておくと、全画面で開けて電波がなくても使えます。
          </p>
          <button
            onClick={async () => {
              if (!promptEvent) return;
              await promptEvent.prompt();
              await promptEvent.userChoice;
              dismiss();
            }}
            className="kuwa-btn-primary w-full mt-3 py-3 text-sm active:scale-[0.98] transition-all"
          >
            ホーム画面に追加する
          </button>
        </>
      )}
    </div>
  );
}
