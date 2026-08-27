# くわらぼ

クワガタのブリード・飼育管理アプリ。成虫・幼虫・蛹の個体管理、ブリードラインの進行、
エサやりチェック、ビン交換記録、収支の集計をひとつにまとめている。

記録は端末のブラウザ (localStorage) にだけ保存される。サーバーには何も送らない。
機種変更や端末をまたぎたいときは、アプリ内の「データの持ち出し」から
JSON で書き出して読みこむ。

## 開発

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 本番ビルド
npm run lint
```

## 配信先

| ブランチ | 用途 | 配信 |
| --- | --- | --- |
| `main` | 本番。実際の飼育記録を入れる場所 | kuwa-labo.vercel.app |
| `dev` | テスト。壊れても困らない場所 | Vercel の Preview |

`dev` で確かめてから `main` に取り込む。急ぎの修正だけ直接 `main` に入れる。

本番以外では、ヘッダーに「テスト」の印が出て、ホーム画面に置いたときの
名前も「くわらぼ試」になる。判定は `src/lib/env.ts` が Vercel のビルド時の
値を見ており、preview とローカルはどちらもテスト扱い。誤るなら本番を
テストと呼ぶ側に倒してある。逆だと、テストと気づかないまま本気の記録を
入れることになるため。

**記録は配信先ごとに完全に別**になる。localStorage はURLの単位で分かれる
ので、テストで入れたものは本番には出てこない。移すときはアプリ内の
「データの持ち出し」を使う。

なお Vercel は同じコミットを二度ビルドしない。`dev` が `main` と同じ
コミットを指している間は Preview が作られないので、確認したいときは
`dev` 側に差分が要る。

## 構成

| 場所 | 中身 |
| --- | --- |
| `src/app/` | ルート直下がアプリ本体。`icon.png` / `apple-icon.png` はホーム画面用 |
| `src/components/` | 画面パーツ。`tabs/` が下タブ6つ、`ui/` が汎用 |
| `src/lib/breeding.ts` | 蛹化・羽化・掘り出しの日数計算、ステージ定義、収支集計 |
| `src/lib/assets.ts` | イラストを data URI で抱えている (外部リクエストなしで表示するため) |
| `src/store/` | zustand + persist。localStorage への保存もここ |
| `src/types/` | 個体・ライン・幼虫などのドメイン型 |
| `public/sw.js` | オフライン用 Service Worker (本番ビルドでのみ登録) |

## オフライン対応

`public/sw.js` は画面本体を**ネット優先**で取りに行き、失敗したときだけキャッシュを返す。
`/_next/static/` 配下はファイル名にハッシュが入る前提で**キャッシュ優先**にしている。
更新を握りつぶさないための使い分けなので、この2つを入れ替えないこと。

## 共有用の1枚HTML

```bash
npm run artifact
```

`next.config.ts` に `output: "export"` を入れた状態でビルドし、CSS/JS を埋め込んだ
`kuwarabo.html` を書き出す。日本語フォントは約250サブセットで数MBになるため埋め込まず、
Google Fonts から読ませている。

## 出自

もとは [rises-fish](https://github.com/yakuminofarm/rises-fish) の `/kuwagata` に
めだか手帳と同居していたものを、独立したアプリとして切り出した。
