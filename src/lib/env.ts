/**
 * 動いている場所が本番かどうか。
 *
 * Vercel がビルド時に入れる値で判断する。preview (テスト用ブランチ) と
 * ローカルはどちらも本番ではないので、まとめてテスト扱いにする。
 * 判定を誤るなら「本番をテストと呼ぶ」側に倒しておきたい。
 * 逆だと、テスト環境と気づかないまま本気の記録を入れてしまう。
 */
export const IS_PRODUCTION = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";
