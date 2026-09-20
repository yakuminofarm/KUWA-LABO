/**
 * 出品リスト。即売会の卓に置く一覧を1枚の画像にする。
 *
 * 個体カード (shareCard.ts) が1頭ぶんなのに対して、こちらは選んだ分をまとめて
 * 表にする。お客さんは「何がいくらで並んでいるか」を横に見比べたい。
 *
 * ## 2種類を出し分ける
 *
 * | | 載るもの | 渡す相手 |
 * |---|---|---|
 * | 配布用 | 種類・産地・累代・性別・体長・羽化日 | お客さん |
 * | 手元用 | 上に加えて **原価** | 自分だけ |
 *
 * 値切られたときに下げてよい線は原価で決まるので、手元用には要る。
 * ただし**買う人に見せる紙ではない**ので、紙の上に大きく断ってある
 * (刷ったあと取り違えると、仕入れ値を相手に見せることになる)。
 *
 * 出品価格の欄は作っていない。いくらで出すかを前もって記録する習慣が
 * あるかどうか分からないので、値段は手書きできるよう空けてある。
 */
import { Beetle, Larva } from "@/types";
import { formatYen, larvaCostPerHead } from "@/lib/breeding";
import { formatDate } from "@/lib/utils";
import { DatePrecision } from "@/types";
import { fitText } from "@/lib/canvasDraw";
import { paginate } from "@/lib/labelSheet";

/** A4 の縦。管理ラベルと同じ 200dpi */
export const LIST_WIDTH = 1654;
export const LIST_HEIGHT = 2339;
const PX_PER_MM = LIST_WIDTH / 210;
const MARGIN = Math.round(12 * PX_PER_MM);
/** 表に使える幅 */
export const USABLE_WIDTH = LIST_WIDTH - MARGIN * 2;

const INK = "#1d1509";
const INK_SOFT = "#5d5039";
const LINE = "rgba(0,0,0,0.18)";
const BAND = "#f3e4c8";
const WARN = "#8a2f14";

const TITLE_H = 118;
const HEAD_H = 74;
const ROW_H = 66;
const FOOT_H = 52;

export type ListKind = "handout" | "mine";

export interface ListColumn {
  label: string;
  width: number;
  /** 右に寄せる (数字の列) */
  right?: boolean;
  value: (row: SaleRow) => string;
}

export interface SaleRow {
  code: string;
  species: string;
  locality: string;
  generation: string;
  gender: string;
  size: string;
  emerged: string;
  /** 原価。分からなければ空 */
  cost: string;
}

/**
 * 原価。買ってきた個体は入手金額、自分で羽化させた個体は元の幼虫にかかった額。
 * 引き上げのときに入手金額を写していないので、幼虫まで遡らないと出てこない
 */
export function unitCost(b: Beetle, larvae: Larva[]): number | undefined {
  if (b.priceYen != null) return b.priceYen;
  const from = b.sourceLarvaId ? larvae.find((l) => l.id === b.sourceLarvaId) : undefined;
  return from ? larvaCostPerHead(from) : undefined;
}

/**
 * 表に入れる日付。「2025年6月15日」は列に入りきらないので詰めた形にする。
 * 月までしか分かっていないものは、日を作らずその旨を残す
 */
function tableDate(iso?: string, precision?: DatePrecision): string {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  if (precision === "month") return `${y}/${m}ごろ`;
  return `${y}/${m}/${String(d.getDate()).padStart(2, "0")}`;
}

export function saleRow(b: Beetle, larvae: Larva[]): SaleRow {
  const cost = unitCost(b, larvae);
  return {
    code: b.code || "番号なし",
    species: b.species,
    locality: b.locality ?? "",
    generation: b.generation ?? "",
    gender: b.gender === "male" ? "♂" : b.gender === "female" ? "♀" : "—",
    size: b.sizeMm != null ? `${b.sizeMm}` : "",
    emerged: tableDate(b.emergedDate, b.emergedDatePrecision),
    cost: cost != null ? formatYen(cost) : "",
  };
}

/**
 * 列の取り方。手元用だけ原価の列が増える。
 *
 * 羽化日の幅は残りから出す。幅を全部決め打ちにすると、どれか1つを直したときに
 * 合計が紙幅とずれ、最後の列が切れたり余ったりする。
 */
export function columnsFor(kind: ListKind): ListColumn[] {
  const mine = kind === "mine";
  const fixed: ListColumn[] = [
    { label: "管理番号", width: mine ? 220 : 240, value: (r) => r.code },
    { label: "種類", width: mine ? 320 : 360, value: (r) => r.species },
    {
      label: "産地・累代",
      width: mine ? 300 : 360,
      value: (r) => [r.locality, r.generation].filter(Boolean).join(" "),
    },
    { label: "性別", width: mine ? 80 : 90, value: (r) => r.gender },
    // 「103.2 mm」は列に入りきらない。この世界では「103.2mm」と詰めて書くのが普通
    { label: "体長", width: mine ? 160 : 170, right: true, value: (r) => (r.size ? `${r.size}mm` : "") },
  ];
  const tail: ListColumn[] = mine
    ? [{ label: "原価", width: 184, right: true, value: (r) => r.cost }]
    : [];

  const used = [...fixed, ...tail].reduce((n, c) => n + c.width, 0);
  const emerged: ListColumn = {
    label: "羽化日",
    width: USABLE_WIDTH - used,
    value: (r) => r.emerged,
  };
  return [...fixed, emerged, ...tail];
}

/** 1枚に何行入るか */
export function rowsPerPage(kind: ListKind): number {
  const band = kind === "mine" ? 58 : 0;
  const room = LIST_HEIGHT - MARGIN * 2 - TITLE_H - band - HEAD_H - FOOT_H;
  return Math.max(1, Math.floor(room / ROW_H));
}

/**
 * 一覧を必要な枚数ぶん作って data URI で返す。
 * 白地に黒で刷る (卓の上で見るものなので、地色は塗らない)
 */
export function buildSaleList(
  rows: SaleRow[],
  kind: ListKind,
  opts: { title?: string; issuedOn?: string } = {}
): string[] {
  const cols = columnsFor(kind);
  const per = rowsPerPage(kind);
  const pages = paginate(rows, per);
  const total = pages.length;

  return pages.map((page, pageIndex) => {
    const canvas = document.createElement("canvas");
    canvas.width = LIST_WIDTH;
    canvas.height = LIST_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("画像を作れませんでした");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, LIST_WIDTH, LIST_HEIGHT);
    ctx.textBaseline = "top";

    const innerW = LIST_WIDTH - MARGIN * 2;
    let y = MARGIN;

    // 見出し
    ctx.fillStyle = INK;
    ctx.font = "bold 58px system-ui, sans-serif";
    ctx.fillText(opts.title?.trim() || "出品リスト", MARGIN, y);
    ctx.fillStyle = INK_SOFT;
    ctx.font = "28px system-ui, sans-serif";
    ctx.textAlign = "right";
    const stamp = [
      opts.issuedOn ? formatDate(opts.issuedOn) : "",
      `${rows.length}頭`,
      total > 1 ? `${pageIndex + 1} / ${total}` : "",
    ]
      .filter(Boolean)
      .join(" ・ ");
    ctx.fillText(stamp, LIST_WIDTH - MARGIN, y + 16);
    ctx.textAlign = "left";
    y += TITLE_H;

    // 手元用の断り書き
    if (kind === "mine") {
      ctx.fillStyle = BAND;
      ctx.fillRect(MARGIN, y - 12, innerW, 46);
      ctx.fillStyle = WARN;
      ctx.font = "bold 26px system-ui, sans-serif";
      ctx.fillText("手元用 — 原価が入っています。お客さんに渡さないでください", MARGIN + 16, y);
      y += 58;
    }

    // 表の見出し
    ctx.fillStyle = INK_SOFT;
    ctx.font = "bold 28px system-ui, sans-serif";
    let x = MARGIN;
    for (const c of cols) {
      ctx.textAlign = c.right ? "right" : "left";
      ctx.fillText(c.label, c.right ? x + c.width - 12 : x + 12, y + 18);
      x += c.width;
    }
    ctx.textAlign = "left";
    y += HEAD_H;

    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(MARGIN, y - 10);
    ctx.lineTo(MARGIN + innerW, y - 10);
    ctx.stroke();

    // 中身
    page.forEach((row, i) => {
      const ry = y + i * ROW_H;
      if (i > 0) {
        ctx.strokeStyle = LINE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(MARGIN, ry);
        ctx.lineTo(MARGIN + innerW, ry);
        ctx.stroke();
      }
      let cx = MARGIN;
      for (const c of cols) {
        const text = c.value(row);
        // 管理番号は取り違えのもとなので、ここだけ太く
        ctx.fillStyle = INK;
        ctx.font = `${c.label === "管理番号" ? "bold " : ""}30px system-ui, sans-serif`;
        ctx.textAlign = c.right ? "right" : "left";
        ctx.fillText(
          fitText(ctx, text, c.width - 24),
          c.right ? cx + c.width - 12 : cx + 12,
          ry + 18
        );
        cx += c.width;
      }
      ctx.textAlign = "left";
    });

    // 足元
    ctx.fillStyle = INK_SOFT;
    ctx.font = "24px system-ui, sans-serif";
    ctx.fillText("くわらぼ", MARGIN, LIST_HEIGHT - MARGIN - 24);

    return canvas.toDataURL("image/jpeg", 0.92);
  });
}

/** 書き出すファイルの名前 */
export function saleListFileName(kind: ListKind, page: number, total: number): string {
  const tag = kind === "mine" ? "mine" : "list";
  return total > 1 ? `kuwa-${tag}-${page + 1}of${total}.jpg` : `kuwa-${tag}.jpg`;
}
