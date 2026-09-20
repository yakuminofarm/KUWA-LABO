/**
 * 手ごたえ (触覚フィードバック)。
 *
 * 割り出しカウンターのように、**画面を見ずに押す**ところで効く。
 * 土まみれの指で数えているとき、押せたかどうかが指に返ってくるだけで
 * 数え間違いが減る。
 *
 * 呼ぶ側を待たせない。手ごたえは「押した瞬間」に返るのが値打ちなので、
 * 中で投げっぱなしにして、失敗しても黙って流す (振動の無い端末・
 * 端末側で切っている場合・ブラウザ版)。
 *
 * 入り切りの設定は作っていない。iOS も Android も OS 側に
 * 「システムの触覚」の設定があり、そこで切れば全部のアプリで止まる。
 */
// プラグイン本体を async 関数から直に返すと then に応答して落ちる
// (src/lib/notify.ts と同じ罠)
type HapticsModule = typeof import("@capacitor/haptics");
let hapticsModule: HapticsModule | null = null;
async function hapticsLib(): Promise<HapticsModule> {
  hapticsModule ??= await import("@capacitor/haptics");
  return hapticsModule;
}

function run(act: (m: HapticsModule) => Promise<void>): void {
  void (async () => {
    try {
      // await を外すと、プラグイン側の失敗が try の外へ抜けて
      // 「拾われなかった約束」になる
      await act(await hapticsLib());
    } catch {
      // 振動できない端末・切っている端末。黙って流す
    }
  })();
}

/** 1つ数えた。軽く、短く */
export function tapFeedback(): void {
  run(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }));
}

/** 1つ戻した。足したときと指で区別できるよう、少し重く */
export function undoFeedback(): void {
  run(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Medium }));
}

/** 記録できた。終わったことが分かる合図 */
export function doneFeedback(): void {
  run(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Success }));
}

/** 手ごたえを試した結果 */
export type HapticCheck =
  /** 端末まで届いた (それでも何も感じないなら、端末側で切ってある) */
  | "ok"
  /** 届かなかった (振動の仕組みが無い・プラグインが入っていない) */
  | "unavailable";

/**
 * 手ごたえが届くか試す。設定の画面から呼ぶ。
 *
 * ふだんは失敗を黙って流しているので、震えないときに
 * 「アプリが呼べていない」のか「端末側で切ってある」のかが分からない。
 * ここだけは結果を返して、どちらなのかを切り分けられるようにする。
 */
export async function checkHaptics(): Promise<HapticCheck> {
  try {
    const { Haptics, NotificationType } = await hapticsLib();
    await Haptics.notification({ type: NotificationType.Success });
    return "ok";
  } catch {
    return "unavailable";
  }
}
