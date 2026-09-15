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

async function shareNative(images: ShareImage[], text: string): Promise<ShareResult> {
  const { Share } = await shareLib();
  const { Filesystem, Directory } = await fsLib();

  // 共有シートにはファイルの在りかを渡す。あとで消えてよいので Cache に置く
  const uris: string[] = [];
  for (const img of images) {
    await Filesystem.writeFile({
      path: img.fileName,
      data: toBase64(img.dataUrl),
      directory: Directory.Cache,
    });
    const { uri } = await Filesystem.getUri({ path: img.fileName, directory: Directory.Cache });
    uris.push(uri);
  }

  try {
    await Share.share({ text, files: uris });
    return "shared";
  } catch (e) {
    return isCancel(e) ? "cancelled" : "failed";
  }
}

async function shareWeb(images: ShareImage[], text: string): Promise<ShareResult> {
  const files = await Promise.all(images.map((i) => dataUrlToFile(i.dataUrl, i.fileName)));

  // 画像を渡せるかは環境によって違う。渡せないなら保存に落とす。
  // 何枚も渡せるかどうかも環境によるので、枚数ごと聞く
  const canShareFile =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    navigator.canShare?.({ files }) === true;

  if (canShareFile) {
    try {
      await navigator.share({ files, text });
      return "shared";
    } catch (e) {
      // やめただけなら保存に落とさない (本人の意思なので何もしない)
      return isCancel(e) ? "cancelled" : "failed";
    }
  }

  let saved = 0;
  for (const img of images) {
    if (saveImage(img.dataUrl, img.fileName)) saved++;
  }
  return saved > 0 ? "saved" : "failed";
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

export interface ShareImage {
  dataUrl: string;
  fileName: string;
}

/** 画像を1枚渡す */
export async function shareCardImage(
  dataUrl: string,
  fileName: string,
  text: string
): Promise<ShareResult> {
  return shareCardImages([{ dataUrl, fileName }], text);
}

/**
 * 画像をまとめて渡す (面付けしたラベルが何枚かになるとき用)。
 * 共有シートは複数のファイルを受け取れる。渡せない環境では1枚ずつ保存に落とす
 */
export async function shareCardImages(
  images: ShareImage[],
  text: string
): Promise<ShareResult> {
  if (images.length === 0) return "failed";
  try {
    return IS_NATIVE ? await shareNative(images, text) : await shareWeb(images, text);
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
