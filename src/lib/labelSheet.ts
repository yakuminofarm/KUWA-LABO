/**
 * 管理ラベルの面付け。
 *
 * 菌糸ビンや成虫ケースには管理番号を貼っておきたい。ビン交換のたびに
 * 手で書き写すのは骨が折れるし、書き間違えると個体が入れ替わる
 * (産地と累代が分からなくなった個体は、もう血統として使えない)。
 *
 * そこで **A4に面付けした1枚の画像** を作る。出し方は個体カードと同じ道
 * (`shareCardImage`) を通るので、アプリ版なら共有シートから「プリント」へ
 * 渡せる。
 *
 * ## 特定のラベル用紙には合わせていない
 *
 * A-one などの用紙は品番ごとに余白がミリ単位で決まっていて、そこに合わせると
 * 「その品番以外ではずれる」ものになる。手元で確かめられないので、
 * **普通紙に刷って切る** 前提の等間隔の面付けにし、切り取りの目安線を入れてある。
 *
 * ## 日付は「あった事実」だけ
 *
 * 次のビン交換の目安のような**予定は刷らない**。紙は貼ったあと直せないので、
 * 予定が変われば嘘になる。最後にビンを替えた日 (起きたこと) だけを入れる。
 */
import { Beetle, BreedingLine, Larva } from "@/types";
import { headCount, latestBottleChange } from "@/lib/breeding";
import { fitText, roundRect } from "@/lib/canvasDraw";
import { drawQr, recordQrText } from "@/lib/qr";

/** A4 を 200dpi で。手元のプリンタでそのまま刷れる大きさ */
export const SHEET_WIDTH = 1654;
export const SHEET_HEIGHT = 2339;
/** 1mm あたりの点の数 (200dpi) */
const PX_PER_MM = SHEET_WIDTH / 210;
const MARGIN = Math.round(10 * PX_PER_MM);

export type LabelSize = "large" | "small" | "qr";

export interface LabelGrid {
  cols: number;
  rows: number;
  /** 画面に出す説明 */
  label: string;
  /** QRを入れるか */
  withQr?: boolean;
}

/**
 * 面の取り方。
 *
 * 大はケース向け (遠くからでも管理番号が読める)、小はビン向け。
 * QR付きは面を大きめに取ってある — QRは刷る大きさを削れない。
 * 1目が 0.5mm を切ると、手元のカメラでは読めなくなる (下の QR_SIZE を参照)。
 */
export const LABEL_GRIDS: Record<LabelSize, LabelGrid> = {
  large: { cols: 3, rows: 7, label: "大 (21面・ケース向け)" },
  small: { cols: 4, rows: 10, label: "小 (40面・ビン向け)" },
  qr: { cols: 3, rows: 8, label: "QR付き (24面)", withQr: true },
};

/**
 * QRの一辺 (点)。25mmほど。
 *
 * 記録のidを入れると25目になるので、まわりの余白 (4目ずつ) を足して33目。
 * 200点なら1目6点 = 0.76mm で、手元のカメラでも読める。
 * ここを小さくすると 0.5mm を割って読めなくなるので、
 * 面を詰めたいときは面の数ではなく **QRなしの型** を使う。
 */
const QR_SIZE = 200;

/** 1枚に入る面の数 */
export function perSheet(size: LabelSize): number {
  const g = LABEL_GRIDS[size];
  return g.cols * g.rows;
}

/** 1枚ぶんずつに分ける */
export function paginate<T>(items: T[], per: number): T[][] {
  if (per <= 0) return items.length > 0 ? [items] : [];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += per) pages.push(items.slice(i, i + per));
  return pages;
}

export interface LabelItem {
  /** いちばん大きく刷る。取り違えを防ぐための主役 */
  code: string;
  /** 下に小さく添える行。2〜3行 */
  lines: string[];
  /** QRに入れる字。QR付きの型で使う */
  qrText: string;
}

const join = (parts: (string | undefined)[]) => parts.filter(Boolean).join(" ");

/** 成虫のラベルに入れる字。ケースに貼って、開けずに分かることを並べる */
export function beetleLabel(b: Beetle): LabelItem {
  const gender = b.gender === "male" ? "♂" : b.gender === "female" ? "♀" : undefined;
  return {
    code: b.code || "番号なし",
    lines: [
      b.species,
      b.locality ?? "",
      join([b.generation, gender, b.sizeMm != null ? `${b.sizeMm}mm` : undefined]),
    ].filter((l) => l !== ""),
    qrText: recordQrText("beetle", b.id),
  };
}

/** 幼虫のラベル。ビンに貼るので、出身ラインと最後に替えた日を入れる */
export function larvaLabel(l: Larva, lines: BreedingLine[]): LabelItem {
  const line = l.lineId ? lines.find((x) => x.id === l.lineId) : undefined;
  const heads = headCount(l);
  const bottle = latestBottleChange(l);
  return {
    code: l.code || "番号なし",
    lines: [
      l.species,
      join([line?.name, heads > 1 ? `${heads}頭` : undefined]),
      join([bottle ? `ビン ${bottle.date}` : undefined, bottle?.bottleSize]),
    ].filter((x) => x !== ""),
    qrText: recordQrText("larva", l.id),
  };
}

const INK = "#1d1509";
const INK_SOFT = "#5d5039";
const GUIDE = "rgba(0,0,0,0.28)";

/**
 * 面付けした画像を、必要な枚数ぶん作って data URI で返す。
 * 白地に黒で刷る (地色を塗るとインクを無駄に使う)
 */
export function buildLabelSheets(items: LabelItem[], size: LabelSize): string[] {
  const grid = LABEL_GRIDS[size];
  const cellW = (SHEET_WIDTH - MARGIN * 2) / grid.cols;
  const cellH = (SHEET_HEIGHT - MARGIN * 2) / grid.rows;
  const withQr = grid.withQr === true;
  const big = size === "large";
  const codeSize = big ? 62 : withQr ? 46 : 44;
  const lineSize = big ? 28 : 22;
  const pad = big ? 26 : withQr ? 22 : 18;
  // QRのぶんだけ字の幅が減る
  const qrRoom = withQr ? QR_SIZE + 14 : 0;

  return paginate(items, perSheet(size)).map((page) => {
    const canvas = document.createElement("canvas");
    canvas.width = SHEET_WIDTH;
    canvas.height = SHEET_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("画像を作れませんでした");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT);
    ctx.textBaseline = "top";

    page.forEach((item, i) => {
      const x = MARGIN + (i % grid.cols) * cellW;
      const y = MARGIN + Math.floor(i / grid.cols) * cellH;

      // 切り取りの目安。実線にすると切り残しが目立つので点線
      ctx.save();
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = GUIDE;
      ctx.lineWidth = 1;
      roundRect(ctx, x + 2, y + 2, cellW - 4, cellH - 4, 10);
      ctx.stroke();
      ctx.restore();

      if (withQr) {
        drawQr(ctx, item.qrText, x + cellW - pad - QR_SIZE, y + (cellH - QR_SIZE) / 2, QR_SIZE, INK);
      }

      const inner = cellW - pad * 2 - qrRoom;
      ctx.fillStyle = INK;
      ctx.font = `bold ${codeSize}px system-ui, sans-serif`;
      ctx.fillText(fitText(ctx, item.code, inner), x + pad, y + pad);

      ctx.fillStyle = INK_SOFT;
      ctx.font = `${lineSize}px system-ui, sans-serif`;
      item.lines.forEach((line, n) => {
        ctx.fillText(
          fitText(ctx, line, inner),
          x + pad,
          y + pad + codeSize + 10 + n * (lineSize + 6)
        );
      });
    });

    return canvas.toDataURL("image/jpeg", 0.92);
  });
}

/** 書き出すファイルの名前。何枚目かを入れて、送った先で並ぶようにする */
export function labelFileName(page: number, total: number): string {
  return total > 1 ? `kuwa-labels-${page + 1}of${total}.jpg` : "kuwa-labels.jpg";
}
