import { BACKDROP_SRC } from "@/lib/assets";

/**
 * 画面全体の背景。雑木林の空気感を、
 * 「地面のグラデーション + 木漏れ日 + 樹皮の質感」で表現する。
 * 固定配置でコンテンツの背面に敷き、カードは不透明のまま前面に浮かせる。
 */
export function ForestBackdrop() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      {/* 地面: 上は林床の日陰、下にいくほど枯葉の明るい茶 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #dcc9a4 0%, #ead9bd 38%, #ecdcc2 68%, #e0cca8 100%)",
        }}
      />

      {/* 木漏れ日: やわらかい光の玉 */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(38% 26% at 78% 8%,  rgba(255, 236, 190, 0.85) 0%, transparent 70%)",
            "radial-gradient(30% 20% at 12% 26%, rgba(255, 240, 205, 0.55) 0%, transparent 72%)",
            "radial-gradient(46% 30% at 62% 54%, rgba(255, 233, 183, 0.42) 0%, transparent 74%)",
            "radial-gradient(34% 22% at 20% 82%, rgba(255, 238, 198, 0.38) 0%, transparent 76%)",
          ].join(", "),
        }}
      />

      {/* 幹の質感。図形で描くと板を並べたようになるので、実際の樹皮を敷く */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${BACKDROP_SRC})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          opacity: 0.78,
        }}
      />

      {/* 四隅を落として奥行きを出す */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 40%, transparent 55%, rgba(58, 38, 18, 0.14) 100%)",
        }}
      />
    </div>
  );
}
