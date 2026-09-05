/**
 * iOS/Android のアプリとして包んだ入れ物の中で動いているか。
 *
 * アプリ版は端末の中の静的なファイルを開くだけで、後ろにサーバがいない。
 * ニュースの取得先や Service Worker の扱いがブラウザ版と変わるので、
 * ビルド時に決まる値で切り分ける。実行時に見分けようとすると両方の経路が
 * 残り、片方が壊れていても気づけないまま出てしまう。
 */
export const IS_NATIVE = process.env.NEXT_PUBLIC_KUWA_TARGET === "native";

/**
 * 動いている場所が本番かどうか。
 *
 * ブラウザ版は Vercel がビルド時に入れる値で判断する。preview (テスト用
 * ブランチ) とローカルはどちらも本番ではないので、まとめてテスト扱いにする。
 * 判定を誤るなら「本番をテストと呼ぶ」側に倒しておきたい。
 * 逆だと、テスト環境と気づかないまま本気の記録を入れてしまう。
 *
 * アプリ版は本番あつかい。端末に入れて使う時点で本物の記録が入るし、
 * ストアから入れたアプリに「テスト」と出ていたら、そちらのほうが紛らわしい。
 */
export const IS_PRODUCTION =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production" || IS_NATIVE;

/**
 * ニュースの取得先。
 *
 * ブラウザ版は自分自身の /api/news を見る。アプリ版は後ろにサーバがいないので、
 * 公開している配信の同じ口を絶対URLで見にいく。
 * ここが落ちてもホームが雑学に切り替わるだけで、記録の読み書きには影響しない。
 */
export const NEWS_ENDPOINT = IS_NATIVE
  ? `${process.env.NEXT_PUBLIC_KUWA_API_ORIGIN ?? "https://kuwa-labo.vercel.app"}/api/news`
  : "/api/news";
