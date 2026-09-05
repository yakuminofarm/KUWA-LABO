# アプリ版 (iOS / Android) の作り方

くわらぼは Web アプリとして作ってあり、それをそのまま Capacitor で包んで
iOS / Android アプリにする。画面や記録の仕組みは1つのままで、
出し先だけが2つに増える形。

## 2つの出し先のちがい

|  | ブラウザ版 (Vercel) | アプリ版 (iOS/Android) |
|---|---|---|
| 中身 | サーバあり | 端末に置いた静的ファイル |
| ニュース | 自分の `/api/news` | 公開中の配信を絶対URLで見にいく |
| Service Worker | 使う (オフライン用) | 使わない (最初から端末内にある) |
| 「テスト」表示 | 本番以外で出る | 出ない (本番あつかい) |

切り替えは環境変数 `NEXT_PUBLIC_KUWA_TARGET=native` の1つだけ。
`next.config.ts` と `src/lib/env.ts` が同じ値を見ている。

### なぜ `/api/news` はアプリ版に入らないのか

サーバがないと動かない口なので、静的な書き出しができずビルドが落ちる。
そこでファイル名を `route.web.ts` にして、ブラウザ版のときだけ
`pageExtensions` で拾うようにしてある。アプリ版は既定の拡張子のままなので
`route.web` は口として認識されず、自然に外れる。

アプリ版のニュースは公開中の `https://kuwa-labo.vercel.app/api/news` を
見にいく。別ドメインになるので、この口には CORS の許可を付けてある
(返すのは公開の見出しだけで、誰の記録も含まない)。
取れなければホームは雑学の一言に切り替わるだけで、記録の読み書きには影響しない。

別の場所に置いた口を使いたいときは `NEXT_PUBLIC_KUWA_API_ORIGIN` で変えられる。

## Mac 側の下ごしらえ (最初の1回)

```sh
# Xcode を App Store から入れる (15GB ほど。いちばん時間がかかる)
xcode-select --install
sudo xcodebuild -license accept

# Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node と CocoaPods (iOS のビルドに要る) と Android Studio
brew install node cocoapods
brew install --cask android-studio

# くわらぼを手元に
git clone https://github.com/yakuminofarm/kuwa-labo
cd kuwa-labo
npm ci
```

## 土台を作る (最初の1回)

`ios/` と `android/` は Mac の上で作る。中に Xcode / Android Studio の
プロジェクトが入るので、作った環境でしか正しく組み上がらない。

```sh
npm run build:native      # out-native/ に静的な一式が出る
npx cap add ios
npx cap add android
```

## ふだんの流れ

画面を直したあとは、これだけで端末に反映できる。

```sh
npm run ios       # ビルド → 同期 → Xcode が開く
npm run android   # ビルド → 同期 → Android Studio が開く
```

内訳:

| コマンド | すること |
|---|---|
| `npm run build:native` | アプリ用に静的な一式を `out-native/` に書き出す |
| `npm run sync:native` | 上に加えて、iOS/Android のプロジェクトへ配る |
| `npm run ios` / `npm run android` | 上に加えて、Xcode / Android Studio を開く |

実機に入れるところから先 (署名・証明書・ストアへの申請) は
Xcode と Android Studio の画面での作業になる。

## 出す前に決めておくこと

- **`appId`** (`capacitor.config.ts`)。いまは `jp.yakuminofarm.kuwalabo`。
  ストアに出したあとに変えると別アプリ扱いになり、入れている人の記録が
  引き継げなくなる。出す前に決めきる
- **Apple Developer Program** 年 $99。iOS を配るのに要る
- **Google Play** 買い切り $25

## まだ手を付けていないこと

土台だけ用意した状態で、次の2つはこれから。
どちらもアプリ版にする一番の目的なので、進めるときはここから。

1. **通知をアプリ版のものに差し替える**
   いまの `FeedingReminder` は画面が開いている間だけ 30秒ごとに見張る作り。
   アプリを閉じていると鳴らない。`@capacitor/local-notifications` に
   置き換えると、閉じていてもエサやりの時間に鳴らせる
2. **記録の置き場を移す**
   いまは `localStorage`。写真を入れると容量上限に当たり、すでに
   「いっぱいです」を知らせる仕組みが入っている。
   `@capacitor/preferences` か SQLite に移すと上限が実質なくなる。
   移すときは、いまの記録を読み出して移し替える処理も要る
