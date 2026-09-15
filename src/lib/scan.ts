/**
 * ラベルのQRをカメラで読む。
 *
 * `@capacitor/barcode-scanner` は、アプリ版では端末のカメラ画面を出し、
 * ブラウザ版では画面の中にカメラを出す (中で html5-qrcode を使っている)。
 * どちらも同じ呼び方で済むので、出し先で分けていない。
 *
 * 読み込みは使うときまで遅らせる。中の読み取り機は大きいので、
 * 起動のたびに読ませると立ち上がりが遅くなる。
 */

import { IS_NATIVE } from "@/lib/env";
import { Beetle, Larva } from "@/types";
import { parseRecordQr } from "@/lib/qr";

/** 読み取った結果。やめたことと、読めなかったことを分ける */
export type ScanOutcome =
  | { kind: "found"; text: string }
  | { kind: "cancelled" }
  | { kind: "failed" };

// プラグイン本体を async 関数から直に返すと then に応答して落ちる
// (src/lib/notify.ts と同じ罠)
type ScannerModule = typeof import("@capacitor/barcode-scanner");
let scannerModule: ScannerModule | null = null;
async function scannerLib(): Promise<ScannerModule> {
  scannerModule ??= await import("@capacitor/barcode-scanner");
  return scannerModule;
}

/** 本人がやめたときのエラーか。端末によって文言が違うので緩く見る */
function isCancel(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /abort|cancel|dismiss|closed|user/i.test(msg);
}

/**
 * ブラウザ版で、カメラが使える見込みがあるか先に確かめる。
 *
 * 読み取り機は自前の画面を開くが、カメラが使えないと**白い板が出たまま**
 * 何も言わずに待ち続ける (許可していない・カメラが無い端末で起きる)。
 * 先にここで確かめて、駄目なときは自分の言葉で伝える。
 *
 * 確かめたら止める。つないだままにするとカメラのランプが点いたままになる。
 * アプリ版は端末側が許可を聞いてくれるので通さない。
 */
async function webCameraReady(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    for (const track of stream.getTracks()) track.stop();
    return true;
  } catch {
    return false;
  }
}

/**
 * カメラを出してQRを1つ読む。
 * 読めた字をそのまま返すので、くわらぼのQRかどうかは呼ぶ側で見る
 * (`parseRecordQr`)
 */
export async function scanQr(): Promise<ScanOutcome> {
  if (!IS_NATIVE && !(await webCameraReady())) return { kind: "failed" };
  try {
    const { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } = await scannerLib();
    const { ScanResult } = await CapacitorBarcodeScanner.scanBarcode({
      hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
      scanInstructions: "ラベルのQRを枠に入れてください",
    });
    const text = (ScanResult ?? "").trim();
    // 何も読めずに閉じたときは空で返ってくることがある
    return text === "" ? { kind: "cancelled" } : { kind: "found", text };
  } catch (e) {
    return isCancel(e) ? { kind: "cancelled" } : { kind: "failed" };
  }
}

/** 読み取った字が、手元のどの記録を指しているか */
export type ScanTarget =
  | { kind: "beetle"; id: string }
  | { kind: "larva"; id: string }
  /** くわらぼのラベルではない (商品のバーコードなど) */
  | { kind: "not-ours" }
  /** くわらぼのラベルだが、その記録が手元に無い */
  | { kind: "not-found" };

/**
 * 読み取った字から、開く記録を決める。
 *
 * 「よそのQR」と「消された記録」を分ける。どちらも開けないが、
 * 言うべきことが違う (前者は貼り間違い、後者は記録を消したあと)。
 */
export function resolveScan(text: string, beetles: Beetle[], larvae: Larva[]): ScanTarget {
  const found = parseRecordQr(text);
  if (!found) return { kind: "not-ours" };

  if (found.kind === "beetle") {
    return beetles.some((b) => b.id === found.id)
      ? { kind: "beetle", id: found.id }
      : { kind: "not-found" };
  }
  return larvae.some((l) => l.id === found.id)
    ? { kind: "larva", id: found.id }
    : { kind: "not-found" };
}
