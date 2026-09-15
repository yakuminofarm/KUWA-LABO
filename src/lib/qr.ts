/**
 * QRコードを作る・読む。
 *
 * ラベルに刷ったQRをアプリのカメラで読むと、その記録が開く。
 * 読み取るのは**自分のアプリの中だけ**なので、中身の形は自分で決めてよい。
 * URLにする必要はなく、短いほうがQRの目が粗くなって読みやすい。
 *
 *   kuwalabo:b:<記録のid>   成虫
 *   kuwalabo:v:<記録のid>   幼虫・蛹
 *
 * 管理番号ではなく **記録のid** を入れる。管理番号は後から書き換えられるし、
 * 同じ番号を2頭に付けてしまうこともある。idなら1つに決まる。
 */
import qrcode from "qrcode-generator";

export type RecordKind = "beetle" | "larva";

const PREFIX = "kuwalabo";
const TAG: Record<RecordKind, string> = { beetle: "b", larva: "v" };

/** QRに入れる字 */
export function recordQrText(kind: RecordKind, id: string): string {
  return `${PREFIX}:${TAG[kind]}:${id}`;
}

/**
 * 読み取った字をほどく。くわらぼのQRでなければ null。
 * 他のQR (商品のバーコードなど) を読んでしまったときに、
 * それらしく振る舞わないようにする
 */
export function parseRecordQr(text: string): { kind: RecordKind; id: string } | null {
  const parts = text.trim().split(":");
  if (parts.length !== 3) return null;
  const [prefix, tag, id] = parts;
  if (prefix !== PREFIX || id === "") return null;
  if (tag === TAG.beetle) return { kind: "beetle", id };
  if (tag === TAG.larva) return { kind: "larva", id };
  return null;
}

/**
 * canvas にQRを描く。`size` の四角に収まるように、まわりの余白ごと入れる。
 *
 * 1目 (モジュール) を整数の点数にそろえてから描く。小数のままだと
 * 目の境目がぼやけ、刷ったときに読めなくなる。
 * まわりの余白 (クワイエットゾーン) は規格どおり4目ぶん。詰めると読めない。
 */
export function drawQr(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color = "#000000"
) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();

  const count = qr.getModuleCount();
  const quiet = 4;
  const total = count + quiet * 2;
  const cell = Math.max(1, Math.floor(size / total));
  const used = cell * total;
  // 余ったぶんは左右上下に振り分けて中央に置く
  const ox = x + Math.floor((size - used) / 2);
  const oy = y + Math.floor((size - used) / 2);

  // 白地を敷く。紙が白でも、下に何か描いてあるときに読めなくなるのを防ぐ
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(ox, oy, used, used);

  ctx.fillStyle = color;
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (!qr.isDark(r, c)) continue;
      ctx.fillRect(ox + (c + quiet) * cell, oy + (r + quiet) * cell, cell, cell);
    }
  }
}

/** 何目ぶんになるか (刷る大きさを決めるときの目安) */
export function qrModuleCount(text: string): number {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr.getModuleCount();
}
