"use client";

import { Check, Heart, Ruler } from "lucide-react";
import { Beetle } from "@/types";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { SpeciesAvatar } from "@/components/KuwagataSVG";
import { PhotoThumb } from "@/components/KuwaUI";
import {
  feedAgoLabel,
  feedIntervalLabel,
  foodFor,
  genderColor,
  needsFeeding,
  todayStr,
} from "@/lib/breeding";
import { getGenderLabel } from "@/lib/utils";
import { TOOL_IMAGE } from "@/lib/assets";

interface BeetleCardProps {
  beetle: Beetle;
  onClick: () => void;
}

export function BeetleCard({ beetle, onClick }: BeetleCardProps) {
  const toggleFavorite = useKuwagataStore((s) => s.toggleFavorite);
  const toggleFedToday = useKuwagataStore((s) => s.toggleFedToday);
  const reminder = useKuwagataStore((s) => s.reminder);
  const isSold = beetle.soldPriceYen != null;
  const inactive = isSold || !beetle.isAlive;
  const fedToday = beetle.lastFedDate === todayStr();
  const showFeed = beetle.matured && !inactive;
  const pendingFeed = needsFeeding(beetle, reminder.intervalDays);
  // ふだんと違う餌・間隔の個体だけ、一覧でも分かるようにする
  const food = foodFor(beetle, reminder.foodType);
  const oddFood = showFeed && food !== reminder.foodType;
  const oddInterval =
    showFeed && beetle.feedIntervalDays != null
      ? feedIntervalLabel(beetle.feedIntervalDays)
      : null;
  // 「あと何日おけるか」の判断材料として、前回からの日数を出す
  const ago = feedAgoLabel(beetle);

  return (
    <button
      onClick={onClick}
      className="kuwa-card w-full text-left p-4 transition-all active:scale-[0.98]"
      style={inactive ? { opacity: 0.66 } : undefined}
    >
      <div className="flex items-start gap-3.5">
        <PhotoThumb src={beetle.photoUrl} fallback={<SpeciesAvatar species={beetle.species} />} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
              {beetle.code}
            </p>
            {beetle.name && (
              <p className="text-xs truncate" style={{ color: "var(--kuwa-ink-soft)" }}>
                「{beetle.name}」
              </p>
            )}
            {isSold ? (
              <span className="kuwa-badge font-maru bg-[#d7e0b8] text-[#55682f]">お迎えされました</span>
            ) : (
              !beetle.isAlive && (
                <span className="kuwa-badge font-maru bg-[#ded5c6] text-[#7a7062]">飼育終了</span>
              )
            )}
          </div>
          <p className="text-xs truncate mt-1" style={{ color: "var(--kuwa-ink-soft)" }}>
            {beetle.species}
            {beetle.locality && ` / ${beetle.locality}`}
          </p>
          <div className="flex items-center gap-2.5 mt-2 flex-wrap">
            <span className={`text-xs font-bold ${genderColor(beetle.gender)}`}>
              {getGenderLabel(beetle.gender)}
            </span>
            {beetle.generation && (
              <span className="kuwa-badge bg-[#e3ceaa] text-[#6b4423]">{beetle.generation}</span>
            )}
            {beetle.sizeMm != null && (
              <span
                className="text-xs font-semibold flex items-center gap-1"
                style={{ color: "var(--kuwa-ink-soft)", fontVariantNumeric: "tabular-nums" }}
              >
                <Ruler className="w-3.5 h-3.5" strokeWidth={2.2} />
                {beetle.sizeMm}mm
              </span>
            )}
            {pendingFeed && (
              <span className="kuwa-badge font-maru bg-[#f0d49b] text-[#a3660f]">
                {ago ? `エサまだ・${ago}` : "エサまだ"}
              </span>
            )}
            {/* まだ期限が来ていない子は、いつあげたかだけ控えめに出す
                (今日あげた子は右のチェックで分かるので出さない) */}
            {showFeed && !pendingFeed && !fedToday && ago && (
              <span className="kuwa-badge bg-[#e8dcc6] text-[#8b7a64]">エサ {ago}</span>
            )}
            {oddInterval && (
              <span className="kuwa-badge bg-[#e3ceaa] text-[#6b4423]">{oddInterval}</span>
            )}
            {oddFood && (
              <span className="kuwa-badge bg-[#e3ceaa] text-[#6b4423]">{food}</span>
            )}
            {beetle.pairId && (
              <span className="kuwa-badge font-maru bg-[#e3ceaa] text-[#6b4423]">ペア</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <span
            role="button"
            tabIndex={0}
            aria-label="お気に入り"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(beetle.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                toggleFavorite(beetle.id);
              }
            }}
            className="p-1.5"
          >
            <Heart
              className="w-[18px] h-[18px] transition-colors"
              strokeWidth={2.2}
              style={{
                color: beetle.isFavorite ? "#b0492f" : "#c0ac8f",
                fill: beetle.isFavorite ? "#b0492f" : "none",
              }}
            />
          </span>

          {showFeed && (
            <span
              role="button"
              tabIndex={0}
              aria-label={fedToday ? "エサやりを取り消す" : `${beetle.code} にエサをあげた`}
              onClick={(e) => {
                e.stopPropagation();
                toggleFedToday(beetle.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  toggleFedToday(beetle.id);
                }
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                pendingFeed ? "animate-kuwa-pop" : ""
              }`}
              style={
                pendingFeed
                  ? { background: "var(--kuwa-amber-soft)", color: "var(--kuwa-amber)" }
                  : { background: "var(--kuwa-moss)", color: "#fdf6e7" }
              }
            >
              {!pendingFeed ? (
                <Check className="w-[18px] h-[18px]" strokeWidth={3} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={TOOL_IMAGE.jelly} alt="" width={20} height={20} />
              )}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
