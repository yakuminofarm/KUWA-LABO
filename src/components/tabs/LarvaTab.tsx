"use client";

import { useState } from "react";
import { AlertTriangle, Search, Sparkles, Worm } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { Larva, LarvaStage } from "@/types";
import {
  BOTTLE_CHANGE_INTERVAL_DAYS,
  DIG_OUT_DAYS,
  PUPA_DAYS_MIN,
  STAGE_COLORS,
  STAGE_LABELS,
  STAGE_ORDER,
  daysBetween,
  daysSinceLastChange,
  genderColor,
  isFeedingStage,
  isPupaStage,
  latestBottleChange,
  latestWeight,
  speciesGradient,
} from "@/lib/breeding";
import { getGenderLabel } from "@/lib/utils";
import { AddLarvaModal } from "@/components/AddLarvaModal";
import { LarvaDetailModal } from "@/components/LarvaDetailModal";
import { EmptyState, Fab, PhotoThumb } from "@/components/KuwaUI";
import { EMPTY_IMAGE } from "@/lib/assets";
import { STAGE_IMAGE } from "@/lib/assets";

type StageFilter = "all" | LarvaStage;

/** 種類カラーの帯 + サムネイル (写真がなければ帯のみ) */
function LarvaThumb({ larva }: { larva: Larva }) {
  if (!larva.photoUrl) return null;
  return <PhotoThumb src={larva.photoUrl} fallback={null} size="sm" />;
}

function LarvaCard({ larva, onClick }: { larva: Larva; onClick: () => void }) {
  const lines = useKuwagataStore((s) => s.lines);
  const line = larva.lineId ? lines.find((l) => l.id === larva.lineId) : undefined;
  const weight = latestWeight(larva);
  const lastChange = latestBottleChange(larva);
  const days = daysSinceLastChange(larva);

  const needsChange =
    larva.isAlive && isFeedingStage(larva.stage) && days != null && days >= BOTTLE_CHANGE_INTERVAL_DAYS;

  const pupaDays = larva.stage === "pupa" && larva.pupaDate ? daysBetween(larva.pupaDate) : null;
  const emergeSoon = pupaDays != null && pupaDays >= PUPA_DAYS_MIN - 5;

  const digDays =
    larva.stage === "adult" && larva.emergedDate && !larva.dugOutDate
      ? daysBetween(larva.emergedDate)
      : null;
  const digReady = digDays != null && digDays >= DIG_OUT_DAYS - 5;

  const alert = needsChange || emergeSoon || digReady;

  return (
    <button
      onClick={onClick}
      className="kuwa-card w-full text-left pl-6 pr-4 py-4 transition-all active:scale-[0.98] relative overflow-hidden"
      style={{
        opacity: larva.isAlive ? 1 : 0.62,
        borderColor: alert ? "rgba(163,102,15,0.45)" : undefined,
      }}
    >
      <span
        className={`absolute left-0 top-0 bottom-0 w-[5px] bg-gradient-to-b ${speciesGradient(larva.species)}`}
      />
      <div className="flex items-start gap-3">
        <LarvaThumb larva={larva} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: "var(--kuwa-ink)" }}>
                {larva.code}
              </p>
              <span className={`kuwa-badge font-maru flex-shrink-0 ${STAGE_COLORS[larva.stage]}`}>
                {STAGE_LABELS[larva.stage]}
              </span>
              {!larva.isAlive && (
                <span className="kuwa-badge font-maru bg-[#ded5c6] text-[#7a7062]">飼育終了</span>
              )}
            </div>
            {weight != null && larva.stage !== "adult" && (
              <p
                className="text-lg font-bold flex-shrink-0"
                style={{ color: "var(--kuwa-moss)", fontVariantNumeric: "tabular-nums" }}
              >
                {weight}
                <span className="text-xs font-semibold ml-0.5" style={{ opacity: 0.6 }}>
                  g
                </span>
              </p>
            )}
            {larva.stage === "adult" && larva.emergedSizeMm != null && (
              <p
                className="text-lg font-bold flex-shrink-0"
                style={{ color: "var(--kuwa-bark)", fontVariantNumeric: "tabular-nums" }}
              >
                {larva.emergedSizeMm}
                <span className="text-xs font-semibold ml-0.5" style={{ opacity: 0.6 }}>
                  mm
                </span>
              </p>
            )}
          </div>

          <div
            className="flex items-center gap-3 mt-2 flex-wrap text-xs"
            style={{ color: "var(--kuwa-ink-soft)" }}
          >
            <span className="truncate">{larva.species}</span>
            {line && (
              <span className="font-bold" style={{ color: "var(--kuwa-amber)" }}>
                {line.name}
              </span>
            )}
            {larva.gender !== "unknown" && (
              <span className={`font-bold ${genderColor(larva.gender)}`}>
                {getGenderLabel(larva.gender)}
              </span>
            )}
            {/* 蛹期はビン情報を出さない (交換しないため) */}
            {lastChange && isFeedingStage(larva.stage) && (
              <span>
                {lastChange.bottleType}
                {lastChange.bottleSize && ` ${lastChange.bottleSize}`}
              </span>
            )}
            {pupaDays != null && <span>蛹化から{pupaDays}日</span>}
            {larva.dugOutDate && (
              <span className="font-bold" style={{ color: "var(--kuwa-moss)" }}>
                掘り出しずみ
              </span>
            )}
          </div>
        </div>
      </div>

      {needsChange && (
        <p
          className="mt-2.5 text-xs font-bold flex items-center gap-1.5"
          style={{ color: "var(--kuwa-clay)" }}
        >
          <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.4} />
          前回の交換から{days}日。そろそろ交換してあげましょう
        </p>
      )}
      {emergeSoon && (
        <p
          className="mt-2.5 text-xs font-bold flex items-center gap-1.5"
          style={{ color: "#8a5410" }}
        >
          <Sparkles className="w-3.5 h-3.5" strokeWidth={2.4} />
          そろそろ羽化。触らず見守りましょう
        </p>
      )}
      {digReady && (
        <p
          className="mt-2.5 text-xs font-bold flex items-center gap-1.5"
          style={{ color: "var(--kuwa-bark)" }}
        >
          <Sparkles className="w-3.5 h-3.5" strokeWidth={2.4} />
          羽化から{digDays}日。掘り出しの目安です
        </p>
      )}
    </button>
  );
}

export function LarvaTab() {
  const { larvae } = useKuwagataStore();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");

  const searched = larvae.filter(
    (l) =>
      !search ||
      l.code.toLowerCase().includes(search.toLowerCase()) ||
      l.species.includes(search)
  );
  const filtered =
    stageFilter === "all" ? searched : searched.filter((l) => l.stage === stageFilter);

  const byCode = (a: Larva, b: Larva) => {
    const aliveDiff = Number(b.isAlive) - Number(a.isAlive);
    if (aliveDiff !== 0) return aliveDiff;
    return a.code.localeCompare(b.code, "ja");
  };

  // 幼虫 / 蛹 / 羽化 の3グループに分けて並べる (蛹は扱いが違うため)
  const groups = [
    {
      key: "larva",
      title: "幼虫",
      img: STAGE_IMAGE.L3,
      color: "var(--kuwa-moss)",
      items: filtered.filter((l) => l.stage === "egg" || isFeedingStage(l.stage)).sort(byCode),
    },
    {
      key: "pupa",
      title: "前蛹・蛹",
      img: STAGE_IMAGE.pupa,
      color: "var(--kuwa-amber)",
      items: filtered.filter((l) => isPupaStage(l.stage)).sort(byCode),
    },
    {
      key: "adult",
      title: "羽化した子",
      img: STAGE_IMAGE.adult,
      color: "var(--kuwa-bark)",
      items: filtered.filter((l) => l.stage === "adult").sort(byCode),
    },
  ].filter((g) => g.items.length > 0);

  const total = filtered.length;
  const selected = larvae.find((l) => l.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
          strokeWidth={2.2}
          style={{ color: "#b3a189" }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="管理番号・種類でさがす"
          className="kuwa-input kuwa-input-search"
          style={{ fontSize: 14 }}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        {(["all", ...STAGE_ORDER] as StageFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            data-on={stageFilter === s}
            className="kuwa-chip kuwa-chip-moss font-maru"
          >
            {s === "all" ? "すべて" : STAGE_LABELS[s]}
          </button>
        ))}
      </div>

      {larvae.length > 0 && (
        <p className="text-xs px-1" style={{ color: "var(--kuwa-ink-soft)" }}>
          {total} 頭を表示中
        </p>
      )}

      {total === 0 ? (
        <EmptyState
          image={EMPTY_IMAGE.larva}
          icon={Worm}
          color="var(--kuwa-moss)"
          title={
            search || stageFilter !== "all"
              ? "この条件に合う子はいませんでした"
              : "まだ育成中の子がいません"
          }
          hint={
            search || stageFilter !== "all"
              ? "条件をゆるめてもう一度さがしてみましょう"
              : "ブリードの割り出しを記録すると、ここに自動で並びます"
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key}>
              <div className="mb-3 px-0.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--kuwa-card)", border: "1px solid var(--kuwa-line)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.img} alt="" width={24} height={24} />
                  </span>
                  <h2
                    className="font-maru text-[15px] font-bold"
                    style={{ color: "var(--kuwa-ink)" }}
                  >
                    {g.title}
                  </h2>
                </div>
                <span className="text-xs font-bold" style={{ color: "var(--kuwa-ink-soft)" }}>
                  {g.items.length}頭
                </span>
              </div>
              <div className="space-y-3">
                {g.items.map((l, i) => (
                  <div
                    key={l.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <LarvaCard larva={l} onClick={() => setSelectedId(l.id)} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Fab onClick={() => setShowAdd(true)} label="幼虫を登録" />

      {showAdd && <AddLarvaModal onClose={() => setShowAdd(false)} />}
      {selected && <LarvaDetailModal larva={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
