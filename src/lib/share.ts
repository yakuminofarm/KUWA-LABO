/**
 * 個体カードを外へ渡す。
 *
 * 出し先で渡し方が違う。
 * - アプリ版: 端末の共有シート (@capacitor/share)。ファイルを渡すには
 *   いったん端末に書く必要があるので、消えてよい置き場 (Cache) に書いてから渡す
 * - ブラウザ版: Web Share API。使えない環境 (パソコンのブラウザなど) では
 *   共有シートが無いので、画像の保存に落とす
 *
 * どこにも渡せなかったことと、本人がやめたことは区別して返す。
 * やめたときに「できませんでした」と出すと、失敗したように見えてしまう。
 */
import { IS_NATIVE } from "@/lib/env";

export type ShareResult = "shared" | "saved" | "cancelled" | "failed";

// プラグイン本体を async 関数から直に返すと then に応答して落ちる
// (src/lib/notify.ts と同じ罠)
type ShareModule = typeof import("@capacitor/share");
let shareModule: ShareModule | null = null;
async function shareLib(): Promise<ShareModule> {
  shareModule ??= await import("@capacitor/share");
  return shareModule;
}

type FsModule = typeof import("@capacitor/filesystem");
let fsModule: FsModule | null = null;
async function fsLib(): Promise<FsModule> {
  fsModule ??= await import("@capacitor/filesystem");
  return fsModule;
}

function toBase64(dataUrl: string): string {
  const i = dataUrl.indexOf(",");
  return i === -1 ? dataUrl : dataUrl.slice(i + 1);
}

async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}

/** 本人が共有をやめたときのエラーか。端末によって文言が違うので、緩く見る */
function isCancel(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /abort|cancel|dismiss/i.test(msg);
}

async function shareNative(dataUrl: string, fileName: string, text: string): Promise<ShareResult> {
  const { Share } = await shareLib();
  const { Filesystem, Directory } = await fsLib();

  // 共有シートにはファイルの在りかを渡す。あとで消えてよいので Cache に置く
  await Filesystem.writeFile({
    path: fileName,
    data: toBase64(dataUrl),
    directory: Directory.Cache,
  });
  const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });

  try {
    await Share.share({ text, files: [uri] });
    return "shared";
  } catch (e) {
    return isCancel(e) ? "cancelled" : "failed";
  }
}

async function shareWeb(dataUrl: string, fileName: string, text: string): Promise<ShareResult> {
  const file = await dataUrlToFile(dataUrl, fileName);

  // 画像を渡せるかは環境によって違う。渡せないなら保存に落とす
  const canShareFile =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    navigator.canShare?.({ files: [file] }) === true;

  if (canShareFile) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (e) {
      // やめただけなら保存に落とさない (本人の意思なので何もしない)
      return isCancel(e) ? "cancelled" : "failed";
    }
  }

  return saveImage(dataUrl, fileName) ? "saved" : "failed";
}

/** 共有シートが無い環境向け。画像をダウンロードさせる */
function saveImage(dataUrl: string, fileName: string): boolean {
  try {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    a.click();
    return true;
  } catch {
    return false;
  }
}

export async function shareCardImage(
  dataUrl: string,
  fileName: string,
  text: string
): Promise<ShareResult> {
  try {
    return IS_NATIVE
      ? await shareNative(dataUrl, fileName, text)
      : await shareWeb(dataUrl, fileName, text);
  } catch (e) {
    return isCancel(e) ? "cancelled" : "failed";
  }
}

/**
 * 共有に使えるファイル名。管理番号は記号が入りうるので削る。
 * `kind` は何の画像かを足すためのもの (例: "pedigree")。
 * 日本語はここで消えてしまうので、英字で渡す
 */
export function cardFileName(code: string, kind?: string): string {
  const safe = code.replace(/[^\w.-]/g, "") || "kuwa";
  return kind ? `${safe}-${kind}.jpg` : `${safe}.jpg`;
}
