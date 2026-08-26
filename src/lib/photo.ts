/**
 * 個体写真の取り込み。
 * localStorage に入れる前提なので、長辺320pxのJPEGへ縮小してから data URI にする
 * (1枚あたり 20〜40KB 程度。無加工だと数MBになり保存できない)。
 */
export const PHOTO_MAX_EDGE = 320;
export const PHOTO_QUALITY = 0.68;

export async function fileToThumbnailDataUrl(file: File): Promise<string> {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("画像を読み込めませんでした"));
      el.src = bitmapUrl;
    });

    const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("画像を変換できませんでした");
    ctx.drawImage(img, 0, 0, w, h);

    return canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
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
