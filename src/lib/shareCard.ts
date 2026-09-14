/**
 * 個体を1枚の画像にする。
 *
 * SNSへ出したり、譲るときに相手へ渡すのに使う。文字だけ送ると、受け取った側は
 * どの個体の話か分からない。写真と要点が1枚に入っていれば、そのまま貼れる。
 *
 * **金額は入れない。** 入手金額と販売価格は人に見せるものではないので、
 * 共有する1枚には載せない (この方針は変えないこと)。
 *
 * 高さは中身に合わせて決める。載る項目の数は個体によって変わる (産地や体長が
 * 空のこともある) ので、
 *
 * - 高さを決め打ちにすると、項目が多い個体で表が下にはみ出して羽化日が切れる
 * - 逆に項目が少ない個体・写真の無い個体では、下半分が空になる
 *
 * そこで **表の高さを先に出し、残りを写真に渡し、余ったら縦を詰める**。
 * 上限は縦4:5 (SNSに貼ったときに切られにくい形) で、それより縦長にはしない。
 */
import { Beetle } from "@/types";
import { formatDate } from "@/lib/utils";
import { drawCover, fitText, loadImage, roundRect } from "@/lib/canvasDraw";

export const CARD_WIDTH = 1080;
/** これより縦長にはしない (縦4:5) */
export const CARD_MAX_HEIGHT = 1350;

const BG = "#ead9bd";
const CARD = "#fffdf6";
const INK = "#31241a";
const INK_SOFT = "#8b7a64";
const LINE = "rgba(107,68,35,0.16)";

const PAD = 64;
/** 管理番号の行 */
const HEAD_H = 104;
/** 足元のアプリ名 */
const FOOT_H = 56;
const PHOTO_GAP = 40;
/** 写真の高さの上限と下限。下限を割るなら写真は載せない (潰れて意味がない) */
const PHOTO_MAX = 760;
const PHOTO_MIN = 360;
const ROW_H = 78;
/** 表の上下の余白をあわせたぶん */
const TABLE_EDGE = 32;
/** 愛称を管理番号の横に置くとき、管理番号に許す幅の割合 */
const CODE_SHARE = 0.64;
/** 愛称にこれだけの幅も残らないなら、愛称は出さない (「…」だけになるので) */
const NAME_MIN = 140;

/**
 * 共有する1枚に載せる項目。**金額は入れない。**
 * 何が載るかを試験から見張れるように外へ出してある
 */
export function cardRows(beetle: Beetle): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [
    { label: "種類", value: beetle.species },
  ];
  if (beetle.locality) out.push({ label: "産地・血統", value: beetle.locality });
  if (beetle.generation) out.push({ label: "累代", value: beetle.generation });
  if (beetle.gender !== "unknown") {
    out.push({ label: "性別", value: beetle.gender === "male" ? "♂ オス" : "♀ メス" });
  }
  if (beetle.sizeMm != null) out.push({ label: "体長", value: `${beetle.sizeMm} mm` });
  if (beetle.emergedDate) {
    out.push({ label: "羽化日", value: formatDate(beetle.emergedDate) });
  }
  return out;
}

/**
 * 個体カードを作って data URI で返す。
 * 写真は渡されたときだけ載せる (無ければ文字だけの1枚になる)
 */
export async function buildShareCard(beetle: Beetle, photoSrc?: string): Promise<string> {
  // 写真。読めなければ写真なしとして続ける (共有そのものは止めない)
  let photo: HTMLImageElement | undefined;
  if (photoSrc) {
    photo = await loadImage(photoSrc).catch(() => undefined);
  }

  const innerW = CARD_WIDTH - PAD * 2;
  const list = cardRows(beetle);
  const tableH = list.length * ROW_H + TABLE_EDGE;

  // 写真に渡せる高さ。上限までしか使わないので、項目が少ない個体では縦が詰まる
  const room = CARD_MAX_HEIGHT - PAD * 2 - HEAD_H - tableH - FOOT_H - PHOTO_GAP;
  const photoH = Math.min(PHOTO_MAX, room);
  const withPhoto = photo != null && photoH >= PHOTO_MIN;
  const photoBlock = withPhoto ? photoH + PHOTO_GAP : 0;
  const height = PAD + photoBlock + HEAD_H + tableH + FOOT_H + PAD;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像を作れませんでした");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CARD_WIDTH, height);
  ctx.textBaseline = "top";

  let y = PAD;

  if (withPhoto && photo) {
    ctx.save();
    roundRect(ctx, PAD, y, innerW, photoH, 32);
    ctx.clip();
    drawCover(ctx, photo, PAD, y, innerW, photoH);
    ctx.restore();
    y += photoBlock;
  }

  // 見出し: 管理番号と愛称。どちらも長いことがあるので幅を分け合う
  const code = beetle.code || "番号なし";
  ctx.fillStyle = INK;
  ctx.font = "bold 72px system-ui, sans-serif";
  const codeText = fitText(ctx, code, beetle.name ? innerW * CODE_SHARE : innerW);
  ctx.fillText(codeText, PAD, y);
  const nameX = PAD + ctx.measureText(codeText).width + 20;
  const nameRoom = PAD + innerW - nameX;
  if (beetle.name && nameRoom >= NAME_MIN) {
    ctx.fillStyle = INK_SOFT;
    ctx.font = "40px system-ui, sans-serif";
    ctx.fillText(fitText(ctx, `「${beetle.name}」`, nameRoom), nameX, y + 26);
  }
  y += HEAD_H;

  // 要点の表
  ctx.fillStyle = CARD;
  roundRect(ctx, PAD, y, innerW, tableH, 28);
  ctx.fill();

  list.forEach((r, i) => {
    const ry = y + TABLE_EDGE / 2 + i * ROW_H;
    if (i > 0) {
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(PAD + 32, ry);
      ctx.lineTo(PAD + innerW - 32, ry);
      ctx.stroke();
    }
    ctx.fillStyle = INK_SOFT;
    ctx.font = "34px system-ui, sans-serif";
    ctx.fillText(r.label, PAD + 36, ry + 22);
    const labelW = ctx.measureText(r.label).width;

    // 値は右端から書く。品種名が長い個体でも見出しに重ならないところまでにする
    ctx.fillStyle = INK;
    ctx.font = "bold 38px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(
      fitText(ctx, r.value, innerW - 72 - labelW - 24),
      PAD + innerW - 36,
      ry + 20
    );
    ctx.textAlign = "left";
  });

  // 足元にアプリ名
  ctx.fillStyle = INK_SOFT;
  ctx.font = "32px system-ui, sans-serif";
  ctx.fillText("くわらぼ", PAD, height - PAD - 32);

  return canvas.toDataURL("image/jpeg", 0.9);
}

/** 画像に添える文。写真を見られない相手にも伝わるように、要点を文字でも書く */
export function shareText(beetle: Beetle): string {
  const parts = [beetle.code, beetle.species];
  if (beetle.locality) parts.push(beetle.locality);
  if (beetle.generation) parts.push(beetle.generation);
  if (beetle.sizeMm != null) parts.push(`${beetle.sizeMm}mm`);
  return parts.filter(Boolean).join(" / ");
}
