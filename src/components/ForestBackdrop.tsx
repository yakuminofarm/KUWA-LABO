/**
 * 画面全体の背景。雑木林の空気感を、
 * 「地面のグラデーション + 木漏れ日 + 木立と葉のシルエット」で表現する。
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

      {/* 木立と葉 */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* 幹: 光の当たる側を明るく */}
          <linearGradient id="trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6b4423" stopOpacity="0.10" />
            <stop offset="45%" stopColor="#4a2e15" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3a230f" stopOpacity="0.07" />
          </linearGradient>
          {/* 上下は地面と空気に溶かす */}
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="18%" stopColor="#fff" stopOpacity="1" />
            <stop offset="78%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="trunkMask">
            <rect width="390" height="844" fill="url(#fade)" />
          </mask>
        </defs>

        {/* 木立: 根元に向かって太く、わずかに反る */}
        <g mask="url(#trunkMask)">
          {/* 左手前の大木 */}
          <path
            d="M-16 0 C -6 190 4 400 10 600 C 14 720 20 800 28 844 L -22 844 Z"
            fill="url(#trunk)"
          />
          {/* 左奥の細い木 */}
          <path
            d="M104 0 C 100 200 102 420 108 640 C 111 740 115 800 120 844 L 96 844 C 94 780 92 700 92 600 C 92 400 96 190 92 0 Z"
            fill="url(#trunk)"
            opacity="0.62"
          />
          {/* 右奥の木 */}
          <path
            d="M276 0 C 282 210 280 430 274 650 C 271 750 268 806 264 844 L 292 844 C 296 800 300 730 302 650 C 306 430 302 210 298 0 Z"
            fill="url(#trunk)"
            opacity="0.75"
          />
          {/* 右手前の大木 */}
          <path
            d="M368 0 C 360 200 356 420 358 640 C 359 740 362 806 366 844 L 410 844 L 410 0 Z"
            fill="url(#trunk)"
          />
          {/* 枝分かれ */}
          <path
            d="M104 236 C 128 228 148 210 162 182 C 170 166 176 156 186 148"
            stroke="#4a2e15"
            strokeOpacity="0.07"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M290 512 C 312 506 330 492 342 470"
            stroke="#4a2e15"
            strokeOpacity="0.06"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          {/* 樹皮の縦筋 */}
          <g stroke="#3a230f" strokeOpacity="0.05" strokeWidth="1.5" fill="none">
            <path d="M-4 40 C 2 240 8 460 14 700" />
            <path d="M100 60 C 98 260 101 480 106 720" />
            <path d="M286 80 C 289 280 286 500 280 740" />
            <path d="M384 30 C 376 230 373 450 375 700" />
          </g>
        </g>

        {/* 葉: 上端と下端にだけ、ごく淡く */}
        <g fill="#55682f" opacity="0.09">
          <g transform="translate(300, -14) rotate(24)">
            <path d="M0 0 C 26 -16 58 -10 70 12 C 56 34 22 38 0 24 Z" />
            <path d="M52 26 C 78 12 108 20 116 44 C 100 64 68 62 50 46 Z" opacity="0.8" />
            <path d="M-18 34 C 4 20 34 26 42 48 C 26 68 -4 66 -20 52 Z" opacity="0.6" />
          </g>
          <g transform="translate(-24, 18) rotate(-16)">
            <path d="M0 0 C 22 -14 50 -8 60 10 C 48 30 18 32 0 20 Z" opacity="0.7" />
            <path d="M34 30 C 56 18 82 26 88 46 C 74 62 46 60 32 48 Z" opacity="0.5" />
          </g>
          <g transform="translate(6, 806) rotate(8)">
            <path d="M0 0 C 24 -14 54 -8 64 12 C 50 32 20 34 0 22 Z" opacity="0.55" />
          </g>
          <g transform="translate(268, 820) rotate(-12)">
            <path d="M0 0 C 22 -12 48 -6 56 10 C 44 28 16 30 0 18 Z" opacity="0.45" />
          </g>
        </g>
      </svg>

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
