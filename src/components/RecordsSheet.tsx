"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { Sheet } from "@/components/KuwaUI";
import { SpeciesAvatar } from "@/components/KuwagataSVG";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { Beetle, Gender } from "@/types";
import {
  beetleRanking,
  genderColor,
  isSelfReared,
  RankingFilters,
  rankedSpeciesOptions,
  speciesRecords,
} from "@/lib/breeding";
import { getGenderLabel } from "@/lib/utils";

function Best({ label, beetle }: { label: string; beetle?: Beetle }) {
  if (!beetle) return null;
  return (
    <div className="flex items-baseline gap-2">
      <span className="kuwa-badge bg-[#e3ceaa] text-[#6b4423] flex-shrink-0">{label}</span>
      <span
        className="text-lg font-bold"
        style={{ color: "var(--kuwa-ink)", fontVariantNumeric: "tabular-nums" }}
      >
        {beetle.sizeMm}
        <span className="text-xs font-semibold ml-0.5" style={{ opacity: 0.6 }}>
          mm
        </span>
      </span>
      <span className="text-xs truncate" style={{ color: "var(--kuwa-ink-soft)" }}>
        {beetle.code}
        {beetle.name && `「${beetle.name}」`}
      </span>
      {isSelfReared(beetle) && (
        <span className="kuwa-badge bg-[#d7e0b8] text-[#55682f] flex-shrink-0">自分で羽化</span>
      )}
    </div>
  );
}

function EmptyState({ hint }: { hint: string }) {
  return (
    <div className="kuwa-card px-6 py-9 text-center">
      <span
        className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
        style={{ background: "var(--kuwa-bark)", opacity: 0.16 }}
      >
        <Trophy className="w-7 h-7" strokeWidth={1.8} style={{ color: "var(--kuwa-bark)" }} />
      </span>
      <p className="font-maru text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
        まだ記録がありません
      </p>
      <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
        {hint}
      </p>
    </div>
  );
}

const GENDER_FILTERS: { key: Gender; label: string }[] = [
  { key: "male", label: "♂ オス" },
  { key: "female", label: "♀ メス" },
];

export function RecordsSheet({ onClose }: { onClose: () => void }) {
  const beetles = useKuwagataStore((s) => s.beetles);
  const [view, setView] = useState<"best" | "ranking">("best");
  const [speciesFilter, setSpeciesFilter] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState<Gender | null>(null);
  const [originFilter, setOriginFilter] = useState<RankingFilters["origin"] | null>(null);

  const records = speciesRecords(beetles);
  const speciesOptions = rankedSpeciesOptions(beetles);
  const ranking = beetleRanking(beetles, {
    species: speciesFilter ?? undefined,
    gender: genderFilter ?? undefined,
    origin: originFilter ?? undefined,
  });

  return (
    <Sheet title="自己ベスト" onClose={onClose}>
      <div className="flex gap-1.5 mb-4">
        {([
          { key: "best", label: "種類別ベスト" },
          { key: "ranking", label: "ランキング" },
        ] as const).map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className="kuwa-chip flex-1"
            data-on={view === v.key}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === "best" ? (
        records.length === 0 ? (
          <EmptyState hint="成虫に体長を入れると、種類ごとの自己ベストがここに並びます。" />
        ) : (
          <div className="space-y-3">
            {records.map((r) => (
              <div key={r.species} className="kuwa-card p-4">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className="w-9 h-9 flex-shrink-0">
                    <SpeciesAvatar species={r.species} />
                  </span>
                  <p className="text-sm font-bold min-w-0 truncate" style={{ color: "var(--kuwa-ink)" }}>
                    {r.species}
                  </p>
                  <span className="text-xs flex-shrink-0 ml-auto" style={{ color: "var(--kuwa-ink-soft)" }}>
                    {r.measured}頭
                  </span>
                </div>
                <div className="space-y-2">
                  <Best label="飼育" beetle={r.bred} />
                  <Best label="野外" beetle={r.wild} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {/* 絞り込み。飼育している種類は人それぞれなので、選択肢は
              あらかじめ用意せず記録があるものだけ出す */}
          <div className="space-y-2">
            {speciesOptions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSpeciesFilter(null)}
                  className="kuwa-chip"
                  data-on={speciesFilter == null}
                >
                  すべての種類
                </button>
                {speciesOptions.map((sp) => (
                  <button
                    key={sp}
                    onClick={() => setSpeciesFilter(sp)}
                    className="kuwa-chip"
                    data-on={speciesFilter === sp}
                  >
                    {sp}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setGenderFilter(null)}
                className="kuwa-chip"
                data-on={genderFilter == null}
              >
                雌雄すべて
              </button>
              {GENDER_FILTERS.map((g) => (
                <button
                  key={g.key}
                  onClick={() => setGenderFilter(g.key)}
                  className="kuwa-chip"
                  data-on={genderFilter === g.key}
                >
                  {g.label}
                </button>
              ))}
              <button
                onClick={() => setOriginFilter(null)}
                className="kuwa-chip"
                data-on={originFilter == null}
              >
                飼育・野外すべて
              </button>
              <button
                onClick={() => setOriginFilter("bred")}
                className="kuwa-chip"
                data-on={originFilter === "bred"}
              >
                飼育
              </button>
              <button
                onClick={() => setOriginFilter("wild")}
                className="kuwa-chip"
                data-on={originFilter === "wild"}
              >
                野外
              </button>
            </div>
          </div>

          {ranking.length === 0 ? (
            <EmptyState hint="この条件に合う記録はまだありません。絞り込みをゆるめてみてください。" />
          ) : (
            <div className="kuwa-card overflow-hidden">
              {ranking.map((b, i) => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 px-4 py-3 border-b last:border-0"
                  style={{ borderColor: "var(--kuwa-line)" }}
                >
                  <span
                    className="w-6 text-center text-sm font-bold flex-shrink-0"
                    style={{ color: i < 3 ? "var(--kuwa-amber)" : "var(--kuwa-ink-soft)" }}
                  >
                    {i + 1}
                  </span>
                  <span className="w-8 h-8 flex-shrink-0">
                    <SpeciesAvatar species={b.species} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--kuwa-ink)" }}>
                      {b.code}
                      {b.name && `「${b.name}」`}
                    </p>
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--kuwa-ink-soft)" }}>
                      {b.species}
                      {" ・ "}
                      <span className={genderColor(b.gender)}>{getGenderLabel(b.gender)}</span>
                    </p>
                  </div>
                  <span
                    className="text-base font-bold flex-shrink-0"
                    style={{ color: "var(--kuwa-bark)", fontVariantNumeric: "tabular-nums" }}
                  >
                    {b.sizeMm}
                    <span className="text-xs font-semibold ml-0.5" style={{ opacity: 0.6 }}>
                      mm
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs leading-relaxed mt-5" style={{ color: "var(--kuwa-ink-soft)" }}>
        飼育品と野外品は育て方の話がまったく違うので、分けて数えています。
        累代が WD のものを野外品として扱います。
        譲り受けた個体を自分の記録にしたくないときは、その子の詳細から外せます。
      </p>
    </Sheet>
  );
}
