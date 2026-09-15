/**
 * iOS の Info.plist に、Capacitor が入れてくれないものを当てる。
 *
 * 1. 日本語のアプリだと知らせる (日付を選ぶ欄の言葉)
 * 2. カメラを何に使うのかを書く (ラベルのQRを読む)
 *
 * ios/ は Git に入れておらず `npx cap add ios` で作り直されるため、
 * 手で直すと次に作り直したとき消える。同期のたびにここで当てる。
 * 何度走らせても同じ結果になる。
 *
 * ── 1. 日本語のアプリだと知らせる ──
 *
 * 日付を選ぶ欄 (`<input type="date">`) の見た目は iOS が用意するもので、
 * Web 側からは言葉を変えられない。iOS はアプリが対応している言語を見て決めるが、
 * Capacitor が作る Info.plist は
 *
 *   CFBundleDevelopmentRegion = en   (CFBundleLocalizations は無し)
 *
 * になっている。これだとアプリが英語専用と見なされ、端末を日本語にしていても
 * 月の名前が September のまま出てしまう。
 *
 * くわらぼの画面は日本語だけなので、対応言語も日本語だけを挙げる。
 * そうすれば端末の言語がどれであっても、ピッカーと画面の言葉が揃う。
 *
 * ── 2. カメラの使い道を書く ──
 *
 * iOS はカメラを使う前に「何に使うのか」を必ず要求する。
 * NSCameraUsageDescription が無いまま呼ぶと、許可を聞く画面も出ずに
 * その場で落ちる (審査でも弾かれる)。
 */
import { readFile, writeFile } from "node:fs/promises";

const PLIST = "ios/App/App/Info.plist";
const LANG = "ja";

const LOCALIZATIONS = `	<key>CFBundleLocalizations</key>
	<array>
		<string>${LANG}</string>
	</array>
`;

const plist = await readFile(PLIST, "utf8").catch(() => null);
if (plist == null) {
  // iOS の土台をまだ作っていない (Mac 以外での同期など)
  console.log(`${PLIST} が無いので何もしません`);
  process.exit(0);
}

let next = plist;
const changed = [];

// 開発言語を日本語にする
const region = /(<key>CFBundleDevelopmentRegion<\/key>\s*<string>)([^<]*)(<\/string>)/;
const found = next.match(region);
if (!found) {
  console.error(`${PLIST} に CFBundleDevelopmentRegion が見つかりません`);
  process.exit(1);
}
if (found[2] !== LANG) {
  next = next.replace(region, `$1${LANG}$3`);
  changed.push(`CFBundleDevelopmentRegion: ${found[2]} → ${LANG}`);
}

// 対応している言語として日本語を挙げる
if (!next.includes("<key>CFBundleLocalizations</key>")) {
  const anchor = "	<key>CFBundleName</key>";
  if (!next.includes(anchor)) {
    console.error(`${PLIST} の形が変わっています (CFBundleName が無い)`);
    process.exit(1);
  }
  next = next.replace(anchor, LOCALIZATIONS + anchor);
  changed.push(`CFBundleLocalizations: ${LANG} を追加`);
}

// カメラの使い道を書く
const CAMERA_KEY = "NSCameraUsageDescription";
const CAMERA_TEXT = "ラベルのQRコードを読み取って、その個体の記録を開くために使います。";
const camera = new RegExp(`(<key>${CAMERA_KEY}</key>\\s*<string>)([^<]*)(</string>)`);
const foundCamera = next.match(camera);
if (!foundCamera) {
  const anchor = "\t<key>CFBundleName</key>";
  next = next.replace(
    anchor,
    `\t<key>${CAMERA_KEY}</key>\n\t<string>${CAMERA_TEXT}</string>\n${anchor}`
  );
  changed.push(`${CAMERA_KEY}: 追加`);
} else if (foundCamera[2] !== CAMERA_TEXT) {
  next = next.replace(camera, `$1${CAMERA_TEXT}$3`);
  changed.push(`${CAMERA_KEY}: 書き直し`);
}

if (changed.length === 0) {
  console.log("Info.plist の設定は当たっています");
  process.exit(0);
}

await writeFile(PLIST, next);
console.log(`${PLIST} を直しました`);
for (const c of changed) console.log(`  ${c}`);
