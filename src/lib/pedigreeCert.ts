/**
 * 血統書を1枚の画像にする。
 *
 * 即売会に出すときや譲るときに、相手は「どの親から採れた子か」を知りたがる。
 * 画面を見せるわけにはいかないので、本人と3世代ぶんの家系を1枚にして渡せるようにする。
 *
 * **これは自分の記録を書き写したものであって、第三者の証明ではない。**
 * 血統書という名前は証明書のように見えるので、そのことを紙の上にも書いておく
 * (足元の注記。消さないこと)。
 *
 * **金額は入れない。** 個体カード (shareCard.ts) と同じ方針。
 *
 * 形は A5 の横 (210dpi くらい)。手元で刷っても読める大きさで、
 * 画面で見るときも横長のまま収まる。
 */
import { Beetle } from "@/types";
import { Pedigree, roleLabel } from "@/lib/pedigree";
import { formatDate } from "@/lib/utils";
import { todayStr } from "@/lib/breeding";
import { drawCover, fitText, loadImage, roundRect } from "@/lib/canvasDraw";

/** A5 横 (148×210mm) を 210dpi ほどで */
export const CERT_WIDTH = 1748;
export const CERT_HEIGHT = 1240;

const PAPER = "#fffdf6";
const FRAME = "rgba(107,68,35,0.35)";
const INK = "#31241a";
const INK_SOFT = "#8b7a64";
const LINE = "rgba(107,68,35,0.18)";
const BOX = "#fbf5e8";
const MALE_BG = "rgba(58,110,165,0.14)";
const MALE_INK = "#2f5f92";
const FEMALE_BG = "rgba(163,80,110,0.14)";
const FEMALE_INK = "#8e3f63";

const MARGIN = 72;
const TITLE_H = 120;
const FOOT_H = 78;
/** 本人の欄の幅 */
const SELF_W = 520;
const GAP = 44;
/** 家系の列の間 */
const COL_GAP = 40;
const PHOTO_MAX = 480;
const SELF_ROW_H = 56;
const BOX_H = 190;

/** 血統書に載せる本人の項目。**金額は入れない** */
export function certRows(b: Beetle): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [{ label: "種類", value: b.species }];
  if (b.locality) out.push({ label: "産地・血統", value: b.locality });
  if (b.generation) out.push({ label: "累代", value: b.generation });
  if (b.gender !== "unknown") {
    out.push({ label: "性別", value: b.gender === "male" ? "♂ オス" : "♀ メス" });
  }
  if (b.sizeMm != null) out.push({ label: "体長", value: `${b.sizeMm} mm` });
  if (b.emergedDate) {
    out.push({ label: "羽化日", value: formatDate(b.emergedDate, b.emergedDatePrecision) });
  }
  return out;
}

/** 種類・産地・累代。分かっているものだけを中黒で繋ぐ (画面の血統欄と同じ書き方) */
function subtitle(b: Beetle): string {
  return [b.species, b.locality, b.generation].filter(Boolean).join(" ・ ");
}

/**
 * 先祖の枠。記録が無いところは点線の空枠にする。
 * 埋まっている枠だけ並べると、家系のどこが分かっていないのかが伝わらない
 */
function drawBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  node: Pedigree | undefined,
  depth: number,
  male: boolean
) {
  const role = roleLabel(depth, male);

  if (!node) {
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, BOX_H, 20);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = INK_SOFT;
    ctx.font = "26px system-ui, sans-serif";
    ctx.fillText(`${role} ・ 記録なし`, x + 28, y + BOX_H / 2 - 16);
    return;
  }

  const b = node.beetle;
  ctx.fillStyle = BOX;
  roundRect(ctx, x, y, w, BOX_H, 20);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, BOX_H, 20);
  ctx.stroke();

  // 続柄の札
  ctx.font = "bold 24px system-ui, sans-serif";
  const chip = `${male ? "♂" : "♀"} ${role}`;
  const chipW = ctx.measureText(chip).width + 28;
  ctx.fillStyle = male ? MALE_BG : FEMALE_BG;
  roundRect(ctx, x + 24, y + 22, chipW, 42, 12);
  ctx.fill();
  ctx.fillStyle = male ? MALE_INK : FEMALE_INK;
  ctx.fillText(chip, x + 38, y + 31);

  const inner = w - 48;
  ctx.fillStyle = INK;
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.fillText(fitText(ctx, b.code || "番号なし", inner), x + 24, y + 78);

  // 愛称と「種類・産地・累代」は行を分ける。1行に詰めると、
  // 愛称のある個体だけ種類が「…」で切れてしまう
  ctx.fillStyle = INK_SOFT;
  if (b.name) {
    ctx.font = "25px system-ui, sans-serif";
    ctx.fillText(fitText(ctx, `「${b.name}」`, inner), x + 24, y + 122);
    ctx.font = "23px system-ui, sans-serif";
    ctx.fillText(fitText(ctx, subtitle(b), inner), x + 24, y + 152);
  } else {
    ctx.font = "25px system-ui, sans-serif";
    ctx.fillText(fitText(ctx, subtitle(b), inner), x + 24, y + 128);
  }
}

/** 親から祖父母へ伸ばす線。枠の右端から次の列の左端まで、かぎ形で繋ぐ */
function drawJoint(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  tops: number[]
) {
  const spine = (fromX + toX) / 2;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(spine, fromY);
  ctx.moveTo(spine, tops[0]);
  ctx.lineTo(spine, tops[tops.length - 1]);
  for (const t of tops) {
    ctx.moveTo(spine, t);
    ctx.lineTo(toX, t);
  }
  ctx.stroke();
}

/**
 * 血統書を作って data URI で返す。
 * 写真は渡されたときだけ載せる。`issuedOn` は発行日 (既定は今日)
 */
export async function buildPedigreeCert(
  pedigree: Pedigree,
  opts: { photoSrc?: string; issuedOn?: string } = {}
): Promise<string> {
  let photo: HTMLImageElement | undefined;
  if (opts.photoSrc) {
    photo = await loadImage(opts.photoSrc).catch(() => undefined);
  }

  const canvas = document.createElement("canvas");
  canvas.width = CERT_WIDTH;
  canvas.height = CERT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像を作れませんでした");

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CERT_WIDTH, CERT_HEIGHT);
  ctx.textBaseline = "top";

  // 外枠
  ctx.strokeStyle = FRAME;
  ctx.lineWidth = 3;
  roundRect(ctx, 24, 24, CERT_WIDTH - 48, CERT_HEIGHT - 48, 24);
  ctx.stroke();

  const self = pedigree.beetle;

  // 見出し
  ctx.fillStyle = INK;
  ctx.font = "bold 60px system-ui, sans-serif";
  ctx.fillText("血統書", MARGIN, MARGIN);
  ctx.fillStyle = INK_SOFT;
  ctx.font = "28px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`発行日 ${formatDate(opts.issuedOn ?? todayStr())}`, CERT_WIDTH - MARGIN, MARGIN + 4);
  ctx.fillText("くわらぼ", CERT_WIDTH - MARGIN, MARGIN + 44);
  ctx.textAlign = "left";

  const top = MARGIN + TITLE_H;
  const bottom = CERT_HEIGHT - MARGIN - FOOT_H;
  const tall = bottom - top;

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(MARGIN, top - 24);
  ctx.lineTo(CERT_WIDTH - MARGIN, top - 24);
  ctx.stroke();

  // ── 本人の欄 ──
  const rows = certRows(self);
  const textH = 84 + rows.length * SELF_ROW_H;
  const photoH = photo ? Math.min(PHOTO_MAX, tall - textH - 28) : 0;
  let y = top;

  if (photo && photoH >= 240) {
    ctx.save();
    roundRect(ctx, MARGIN, y, SELF_W, photoH, 20);
    ctx.clip();
    drawCover(ctx, photo, MARGIN, y, SELF_W, photoH);
    ctx.restore();
    y += photoH + 28;
  }

  ctx.fillStyle = INK;
  ctx.font = "bold 52px system-ui, sans-serif";
  ctx.fillText(fitText(ctx, self.code || "番号なし", SELF_W), MARGIN, y);
  if (self.name) {
    ctx.fillStyle = INK_SOFT;
    ctx.font = "28px system-ui, sans-serif";
    ctx.fillText(fitText(ctx, `「${self.name}」`, SELF_W), MARGIN, y + 56);
  }
  y += 84;

  rows.forEach((r, i) => {
    const ry = y + i * SELF_ROW_H;
    if (i > 0) {
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(MARGIN, ry);
      ctx.lineTo(MARGIN + SELF_W, ry);
      ctx.stroke();
    }
    ctx.fillStyle = INK_SOFT;
    ctx.font = "25px system-ui, sans-serif";
    ctx.fillText(r.label, MARGIN, ry + 18);
    const labelW = ctx.measureText(r.label).width;

    ctx.fillStyle = INK;
    ctx.font = "bold 29px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(fitText(ctx, r.value, SELF_W - labelW - 24), MARGIN + SELF_W, ry + 16);
    ctx.textAlign = "left";
  });

  // ── 家系 (親と祖父母の2列) ──
  const colW = (CERT_WIDTH - MARGIN * 2 - SELF_W - GAP - COL_GAP) / 2;
  const parentX = MARGIN + SELF_W + GAP;
  const grandX = parentX + colW + COL_GAP;

  const parents: { node?: Pedigree; male: boolean }[] = [
    { node: pedigree.father, male: true },
    { node: pedigree.mother, male: false },
  ];

  // 祖父母は4枠を等間隔に並べ、親はその2枠ぶんの真ん中に置く
  const grandSlot = tall / 4;
  const grandTops = [0, 1, 2, 3].map((i) => top + grandSlot * i + (grandSlot - BOX_H) / 2);

  parents.forEach((p, pi) => {
    const pairTop = grandTops[pi * 2];
    const pairBottom = grandTops[pi * 2 + 1] + BOX_H;
    const boxY = (pairTop + pairBottom) / 2 - BOX_H / 2;

    const grands: { node?: Pedigree; male: boolean }[] = [
      { node: p.node?.father, male: true },
      { node: p.node?.mother, male: false },
    ];
    const tops = grands.map((_, gi) => grandTops[pi * 2 + gi] + BOX_H / 2);
    drawJoint(ctx, parentX + colW, boxY + BOX_H / 2, grandX, tops);

    drawBox(ctx, parentX, boxY, colW, p.node, 1, p.male);
    grands.forEach((g, gi) => {
      drawBox(ctx, grandX, grandTops[pi * 2 + gi], colW, g.node, 2, g.male);
    });
  });

  // 本人から親への線
  const parentCenters = parents.map((_, pi) => {
    const pairTop = grandTops[pi * 2];
    const pairBottom = grandTops[pi * 2 + 1] + BOX_H;
    return (pairTop + pairBottom) / 2;
  });
  drawJoint(ctx, MARGIN + SELF_W, top + tall / 2, parentX, parentCenters);

  // ── 足元の注記 ──
  const foot = CERT_HEIGHT - MARGIN - FOOT_H + 16;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(MARGIN, foot - 12);
  ctx.lineTo(CERT_WIDTH - MARGIN, foot - 12);
  ctx.stroke();

  ctx.fillStyle = INK_SOFT;
  ctx.font = "23px system-ui, sans-serif";
  ctx.fillText(
    "この血統書は、くわらぼに入れた記録をそのまま書き出したものです。第三者による証明ではありません。",
    MARGIN,
    foot + 4
  );
  const from = pedigree.line ? `${pedigree.line.name} から採れた子です。` : "";
  ctx.fillText(`${from}記録に無い先祖は「記録なし」としています。`, MARGIN, foot + 38);

  return canvas.toDataURL("image/jpeg", 0.92);
}

/** 血統書に添える文 */
export function certText(b: Beetle): string {
  const parts = [b.code, b.species];
  if (b.locality) parts.push(b.locality);
  if (b.generation) parts.push(b.generation);
  return `${parts.filter(Boolean).join(" / ")} の血統書`;
}
