/**
 * くわらぼを1枚のHTMLにまとめる (Artifact 公開用)。
 *
 *   npx next build   # next.config.ts に output:"export" を入れた状態で
 *   node scripts/build-artifact.mjs
 *
 * CSS/JS/小さなフォントは data URI で埋め込み、
 * 日本語フォント (Zen Maru Gothic) だけは約250サブセットで数MBになるため
 * 埋め込まず Google Fonts から読ませる。
 */
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("out");
const SRC = path.join(OUT, "index.html");
const DEST = process.argv[2] ?? path.resolve("kuwarabo.html");

if (!fs.existsSync(SRC)) {
  console.error(`${SRC} がありません。先に output:"export" でビルドしてください`);
  process.exit(1);
}

let html = fs.readFileSync(SRC, "utf8");

// ── CSS: 埋め込み。日本語フォントの @font-face は除去 ──
html = html.replace(
  /<link rel="stylesheet" href="(\/_next\/[^"]+\.css)"[^>]*\/>/g,
  (_m, href) => {
    let css = fs.readFileSync(path.join(OUT, href), "utf8");
    css = css.replace(/@font-face\{[^}]*\}/g, (block) =>
      /font-family:Zen Maru Gothic;/.test(block) && /url\(/.test(block) ? "" : block
    );
    css = css.replace(/url\((\.\.\/media\/[^)]+\.woff2)\)/g, (_mm, rel) => {
      const file = path.join(OUT, "_next/static", rel.replace("../", ""));
      return `url(data:font/woff2;base64,${fs.readFileSync(file).toString("base64")})`;
    });
    return `<style>${css}</style>`;
  }
);

// ── JS: 本文末尾へまとめて埋め込む ──
const chunks = [];
html = html.replace(
  /<script src="(\/_next\/[^"]+\.js)"([^>]*)><\/script>/g,
  (_m, src, attrs) => {
    if (attrs.includes("noModule")) return ""; // 旧ブラウザ用フォールバックは不要
    let js = fs.readFileSync(path.join(OUT, src), "utf8");
    // チャンクは document.currentScript から自分のパスを解決するため差し替える
    const fake =
      `{getAttribute:function(a){return a==="src"?${JSON.stringify(src)}:null},` +
      `src:location.origin+${JSON.stringify(src)}}`;
    js = js.replace('"object"==typeof document?document.currentScript:void 0', fake);
    js =
      `try{var __cs=document.currentScript;` +
      `if(__cs&&!__cs.hasAttribute("src"))__cs.setAttribute("src",location.origin+${JSON.stringify(src)});}catch(e){}\n` +
      js;
    chunks.push(`<script>${js.replace(/<\/script/gi, "<\\/script")}</script>`);
    return "";
  }
);

// 取得できない参照は消す (Artifact の CSP でブロックされるため)
html = html.replace(/<link rel="preload"[^>]*\/>/g, "");
html = html.replace(/<link rel="(icon|apple-touch-icon|manifest)"[^>]*\/>/g, "");

const head = html.match(/<head>([\s\S]*)<\/head>/)[1];
const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];
const htmlClass = html.match(/<html[^>]*class="([^"]*)"/)?.[1] ?? "";
const bodyClass = html.match(/<body[^>]*class="([^"]*)"/)?.[1] ?? "";

const setup =
  `<script>document.documentElement.setAttribute('lang','ja');` +
  `document.documentElement.className=${JSON.stringify(htmlClass)};` +
  `document.body.className=${JSON.stringify(bodyClass)};</script>`;

const gfont =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700&display=swap">' +
  '<style>.font-maru{font-family:"Zen Maru Gothic","Hiragino Maru Gothic ProN","M PLUS Rounded 1c",sans-serif}</style>';

const headInner = head
  .replace(/<title>[^<]*<\/title>/, "")
  .replace(
    /(<meta name="description" content=")[^"]*(")/,
    "$1クワガタのブリード管理 - 成虫・幼虫・蛹・給餌・収支を記録$2"
  );

const flat = `<title>くわらぼ</title>\n${gfont}${headInner}${setup}${body}\n${chunks.join("\n")}`;
fs.writeFileSync(DEST, flat);
console.log(`${DEST} に書き出しました (${(flat.length / 1024 / 1024).toFixed(2)}MB, chunks: ${chunks.length})`);
