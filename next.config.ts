import type { NextConfig } from "next";

/**
 * 出し先が2つある。
 *
 * - ブラウザ版 (Vercel): 今までどおり。ニュースを取りにいく /api/news が
 *   サーバとして動く
 * - アプリ版 (iOS/Android): Capacitor で包むので、端末に置ける静的な
 *   ファイル一式が要る。後ろにサーバはいない
 *
 * /api/news はサーバ頼みで静的にできず、置いたままだとアプリ版のビルドが
 * 落ちる。ファイル名を route.web.ts にしておき、ブラウザ版のときだけ
 * pageExtensions で拾う。アプリ版は既定の拡張子のままなので "route.web" は
 * 口として認識されず、自然に外れる。
 * (アプリ版のニュースは公開中の配信を絶対URLで見にいく。src/lib/env.ts)
 */
// 画面側 (src/lib/env.ts) と同じ1つの値で切り替える。
// 2つに分けると、片方だけ付け忘れて「静的なのにサーバ前提のまま」という
// ちぐはぐな出来上がりになりうる
const native = process.env.NEXT_PUBLIC_KUWA_TARGET === "native";

const nextConfig: NextConfig = native
  ? {
      output: "export",
      // ブラウザ版の .next と混ざらないよう、別の場所へ出す
      distDir: "out-native",
    }
  : {
      pageExtensions: ["web.ts", "ts", "tsx", "js", "jsx"],
    };

export default nextConfig;
