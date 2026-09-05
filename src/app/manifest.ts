import type { MetadataRoute } from "next";
import { IS_PRODUCTION } from "@/lib/env";

/**
 * 中身は配信ごとに決まっていて、リクエストのたびに変わることはない。
 * これを書いておかないと、アプリ用の静的な書き出しでここだけ落ちる。
 */
export const dynamic = "force-static";

/**
 * ホーム画面に置いたときの見え方。
 *
 * テスト用の配信を同じ名前で入れると、ホーム画面にそっくりなアイコンが
 * 2つ並んでどちらを開いたか分からなくなる。記録は配信ごとに別なので、
 * 取り違えるとどちらに入れたか追えなくなる。名前で見分けられるようにする。
 */
export default function manifest(): MetadataRoute.Manifest {
  const suffix = IS_PRODUCTION ? "" : " (テスト)";
  return {
    id: "/",
    name: `くわらぼ${suffix}`,
    short_name: IS_PRODUCTION ? "くわらぼ" : "くわらぼ試",
    description: "クワガタのブリード・飼育管理アプリ",
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ead9bd",
    theme_color: "#ead9bd",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
