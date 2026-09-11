import { Capacitor } from "@capacitor/core";
import { IS_NATIVE } from "@/lib/env";
import type { FeedingNotice } from "@/lib/breeding";

/**
 * 独自の音は用意していないので、端末の標準通知音を使う。
 *
 * ただし iOS と Android で「無音」に落ちる条件が逆になっている。
 * - 未指定のまま: iOS は無音 / Android は端末既定の音が鳴る
 * - 存在しないファイル名を渡す: iOS は「見つからない」と判断して既定の
 *   音にフォールバックする (振動も音に連動して付いてくる) / Android は
 *   8以降だと無音になる (Android は通知チャンネル側で音を決める)
 * 両対応の値は無いので、iOS のときだけ実在しない名前を渡す。Android は
 * 何も指定しないほうが端末既定の音になる
 */
function defaultSound(): string | undefined {
  return Capacitor.getPlatform() === "ios" ? "default" : undefined;
}

/**
 * お知らせを鳴らす側の受け持ち。
 *
 * ブラウザ版とアプリ版で、できることがまるで違う。
 *
 * - ブラウザ版: 画面が開いている間しか動けない。その場で1回鳴らすだけ
 * - アプリ版: 閉じている間も鳴らしたいので、先の予定を端末に積んでおく
 *
 * 呼ぶ側がこの違いを気にしなくて済むよう、ここで吸収する。
 * どちらもうまくいかないことがある (許可していない・積める上限に達した等) が、
 * お知らせが出ないだけで記録には影響しないので、失敗は握りつぶす。
 */

export type NotifyPermission = "default" | "granted" | "denied" | "unsupported";

/**
 * アプリ版の通知は端末の機能なので、要るときだけ読み込む。
 * ブラウザ版では一度も呼ばないので、読み込みも起きない。
 *
 * 返すのは「プラグイン本体」ではなく、それを包んだモジュールのほう。
 * Capacitor のプラグインは、どんな名前のプロパティにも応答する作りに
 * なっている。then という名前にも応答してしまうため、async 関数から
 * そのまま返すと JS が「まだ解決していない約束」と勘違いして then() を
 * 呼び、実装がないと言われて落ちる。1枚かぶせて渡せばそうならない。
 */
type NotifyModule = typeof import("@capacitor/local-notifications");
let loaded: NotifyModule | null = null;

async function load(): Promise<NotifyModule> {
  loaded ??= await import("@capacitor/local-notifications");
  return loaded;
}

/** いまの許可状態を読む */
export async function readPermission(): Promise<NotifyPermission> {
  if (IS_NATIVE) {
    try {
      const { LocalNotifications } = await load();
      const { display } = await LocalNotifications.checkPermissions();
      return display === "prompt" || display === "prompt-with-rationale"
        ? "default"
        : (display as NotifyPermission);
    } catch {
      return "unsupported";
    }
  }
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission as NotifyPermission;
}

/** 許可を尋ねる。すでに答えが出ているときは、その答えをそのまま返す */
export async function requestPermission(): Promise<NotifyPermission> {
  if (IS_NATIVE) {
    try {
      const { LocalNotifications } = await load();
      const { display } = await LocalNotifications.requestPermissions();
      return display === "prompt" || display === "prompt-with-rationale"
        ? "default"
        : (display as NotifyPermission);
    } catch {
      return "unsupported";
    }
  }
  if (typeof Notification === "undefined") return "unsupported";
  return (await Notification.requestPermission()) as NotifyPermission;
}

/** 許可した直後に、どんな見た目で出るのかを1回だけ見せる */
export async function showSample(): Promise<void> {
  const title = "くわらぼ";
  const body = "この形でお知らせします";
  if (IS_NATIVE) {
    try {
      const { LocalNotifications } = await load();
      await LocalNotifications.schedule({
        // 今すぐ鳴らす。id は積んである予定 (日付から作る番号) と
        // ぶつからないよう、十分に離した値にしておく
        notifications: [{ id: 1_000_000, title, body, sound: defaultSound() }],
      });
    } catch {
      /* 見本が出せなくても設定そのものには影響しない */
    }
    return;
  }
  try {
    new Notification(title, { body });
  } catch {
    /* 通知が出せない環境では何もしない */
  }
}

/**
 * 端末に積んである予定を、渡された内容に置き換える。
 *
 * 足すのではなく置き換えなのは、エサをあげた・設定を変えた後に、
 * 古い予定がそのまま残ると実態と合わない知らせが鳴ってしまうため。
 * ブラウザ版には積む仕組みがないので何もしない。
 */
export async function syncFeedingNotices(notices: FeedingNotice[]): Promise<void> {
  if (!IS_NATIVE) return;
  try {
    const { LocalNotifications } = await load();

    const { notifications: old } = await LocalNotifications.getPending();
    if (old.length > 0) {
      await LocalNotifications.cancel({ notifications: old.map((n) => ({ id: n.id })) });
    }
    if (notices.length === 0) return;

    const sound = defaultSound();
    await LocalNotifications.schedule({
      notifications: notices.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        sound,
        schedule: { at: n.at, allowWhileIdle: true },
      })),
    });
  } catch {
    /* 積めなくても記録には影響しない */
  }
}
