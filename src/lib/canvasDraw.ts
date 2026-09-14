/**
 * canvas に絵を描くときの共通の手。
 *
 * 個体カード (shareCard.ts) と血統書 (pedigreeCert.ts) で同じことをするので、
 * ここに出してある。どちらも「画面には無い1枚の画像」を作るためのもの。
 */

/** 角の丸い四角の輪郭を引く (塗るか線を引くかは呼ぶ側で決める) */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** 枠を埋めるように切り取って描く (縦横比を崩さない) */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/**
 * 枠に収まるところまでにして、続きがあることを示す。
 * いま ctx に入っているフォントで測るので、font を決めたあとに呼ぶ。
 */
export function fitText(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (max <= 0) return "";
  if (ctx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
  return `${s}…`;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("写真を読めませんでした"));
    el.src = src;
  });
}
