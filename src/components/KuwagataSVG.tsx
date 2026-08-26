import { APP_ICON_SRC, speciesImage } from "@/lib/assets";

/**
 * くわらぼのクワガタ表示。
 * フラットデザインで生成した画像を使う (data URI で同梱)。
 * 背景に敷くシルエットだけは色を変えたいので SVG を残している。
 */

/** ヘッダー等のアプリアイコン (角丸タイル込みの画像) */
export function KuwaAppIcon({ size = 36 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={APP_ICON_SRC}
      alt=""
      width={size}
      height={size}
      className="flex-shrink-0"
      style={{ borderRadius: size * 0.28 }}
    />
  );
}

interface SpeciesAvatarProps {
  species: string;
  size?: "md" | "lg";
  className?: string;
}

/**
 * 種類ごとのクワガタを載せたアバター。
 * 虫そのものが種類の色を持つため、タイルは明るい無地にしている
 * (濃色タイルだと黒系の種が背景に沈んで見えなくなる)。
 */
export function SpeciesAvatar({ species, size = "md", className }: SpeciesAvatarProps) {
  const dims = size === "lg" ? "w-14 h-14 rounded-2xl" : "w-11 h-11 rounded-xl";
  const inner = size === "lg" ? 48 : 38;
  return (
    <div
      className={[dims, "flex items-center justify-center flex-shrink-0 overflow-hidden", className]
        .filter(Boolean)
        .join(" ")}
      style={{ background: "#f4e7cf" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={speciesImage(species)} alt="" width={inner} height={inner} />
    </div>
  );
}

interface SilhouetteProps {
  size?: number;
  color?: string;
  className?: string;
}

/**
 * 背景に敷く単色シルエット (ヒーローと森の背景用)。
 * 不透明度や色を変えて使うため、画像ではなく SVG で持つ。
 */
export function KuwagataSVG({ size = 48, color = "currentColor", className }: SilhouetteProps) {
  const mandible =
    "M41 70 C26 65 14 51 16 34 C17.5 22 24 14 33 11 " +
    "C30 20 29 29 31 37 L41 34 C37 43 36 50 38 56 C40 62 44 67 48 70 Z";
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      <g fill={color}>
        <path d={mandible} />
        <g transform="scale(-1,1) translate(-100,0)">
          <path d={mandible} />
        </g>
        <path d="M36 66 C28 64 21 66 16 71 C13.5 73.5 13 76 14.5 77.5 C19 73 26 71 33 72 Z" />
        <path d="M64 66 C72 64 79 66 84 71 C86.5 73.5 87 76 85.5 77.5 C81 73 74 71 67 72 Z" />
        <path d="M50 58 C42 58 37 62 37 68 C37 73 42 76 50 76 C58 76 63 73 63 68 C63 62 58 58 50 58 Z" />
        <path d="M31 73 L69 73 C75 73 79 77 79 83 L79 90 C79 95 75 98 69 98 L31 98 C25 98 21 95 21 90 L21 83 C21 77 25 73 31 73 Z" />
      </g>
    </svg>
  );
}
