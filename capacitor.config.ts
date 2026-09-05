import type { CapacitorConfig } from "@capacitor/cli";

/**
 * くわらぼを iOS/Android のアプリとして包むための設定。
 *
 * 中身は `npm run build:native` が出した静的なファイル一式 (out-native) を
 * そのまま端末に置いて開くだけ。記録は今までどおり端末の中だけにあり、
 * 外に出るのはニュースの見出しを取りにいくときだけ (src/lib/env.ts)。
 */
const config: CapacitorConfig = {
  // 逆ドメイン表記。App Store / Google Play に出したあとに変えると
  // 別アプリ扱いになり、入れている人の記録が引き継げなくなる。
  // 出す前に決めきる
  appId: "jp.yakuminofarm.kuwalabo",
  appName: "くわらぼ",
  webDir: "out-native",
  ios: {
    // 白い背景のまま一瞬出ると、地色 (生成り) との差がちらつく
    backgroundColor: "#ead9bd",
  },
  android: {
    backgroundColor: "#ead9bd",
  },
};

export default config;
