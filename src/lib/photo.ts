/**
 * 個体写真の取り込み。1枚から2つの大きさを作る。
 *
 * - `thumb` (長辺320px): 一覧のサムネイルと登録画面のプレビュー用
 * - `full` (長辺1280px): タップして大きく見るとき用
 *
 * 大きいほうだけにすると、44pxのサムネイルのために1280pxを展開することになり、
 * 50頭並べただけで数百MBのビットマップを抱えて端末が持たない。
 * 小さいほうだけにすると、大きく見たときに粗い。だから両方持つ。
 *
 * 1280pxはいまのiPhoneの横幅 (実ピクセルで1200前後) に合わせた値。
 * これ以上あっても画面では見分けがつかない。
 */
export const PHOTO_THUMB_EDGE = 320;
export const PHOTO_FULL_EDGE = 1280;

const THUMB_QUALITY = 0.68;
const FULL_QUALITY = 0.82;

/** 記録に入れる写真。大きいほうは必ずあり、小さいほうは無いこともある */
export interface PhotoSizes {
  full: string;
  thumb?: string;
}

function resize(img: HTMLImageElement, maxEdge: number, quality: number): string {
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像を変換できませんでした");
  ctx.drawImage(img, 0, 0, w, h);

  return canvas.toDataURL("image/jpeg", quality);
}

export async function fileToPhoto(file: File): Promise<PhotoSizes> {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("画像を読み込めませんでした"));
      el.src = bitmapUrl;
    });

    return {
      full: resize(img, PHOTO_FULL_EDGE, FULL_QUALITY),
      thumb: resize(img, PHOTO_THUMB_EDGE, THUMB_QUALITY),
    };
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

/** 保存容量が足りているか (localStorage は概ね5MB) */
export function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}
