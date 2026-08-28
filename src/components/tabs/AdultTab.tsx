"use client";

import { useState } from "react";
import { Bug, Search } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { Beetle } from "@/types";
import { BeetleCard } from "@/components/BeetleCard";
import { AddBeetleModal } from "@/components/AddBeetleModal";
import { BeetleDetailModal } from "@/components/BeetleDetailModal";
import { EmptyState, Fab } from "@/components/KuwaUI";
import { EMPTY_IMAGE } from "@/lib/assets";
import { SPECIES_OPTIONS, groupBySpecies, needsFeeding } from "@/lib/breeding";
import { BeetleFormState, duplicateBeetleForm } from "@/components/BeetleFields";

type FilterKey = "alive" | "unfed" | "male" | "female" | "matured" | "favorite" | "sold";

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: "alive",    label: "飼育中" },
  { key: "unfed",    label: "エサまだ" },
  { key: "male",     label: "♂ オス" },
  { key: "female",   label: "♀ メス" },
  { key: "matured",  label: "後食済み" },
  { key: "favorite", label: "お気に入り" },
  { key: "sold",     label: "販売済み" },
];

type SortKey = "newest" | "oldest" | "size" | "code";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "新しい順" },
  { key: "oldest", label: "古い順" },
  { key: "size",   label: "大きい順" },
  { key: "code",   label: "番号順" },
];

function applyFilter(
  beetles: Beetle[],
  active: Set<FilterKey>,
  intervalDays: number
): Beetle[] {
  if (active.size === 0) return beetles;
  return beetles.filter((b) => {
    if (active.has("alive") && (!b.isAlive || b.soldPriceYen != null)) return false;
    if (active.has("unfed") && !needsFeeding(b, intervalDays)) return false;
    if (active.has("sold") && b.soldPriceYen == null) return false;
    if (active.has("male") && b.gender !== "male") return false;
    if (active.has("female") && b.gender !== "female") return false;
    if (active.has("matured") && !b.matured) return false;
    if (active.has("favorite") && !b.isFavorite) return false;
    return true;
  });
}

function applySort(beetles: Beetle[], key: SortKey): Beetle[] {
  return [...beetles].sort((a, b) => {
    switch (key) {
      case "newest": return b.acquiredDate.localeCompare(a.acquiredDate);
      case "oldest": return a.acquiredDate.localeCompare(b.acquiredDate);
      case "size":   return (b.sizeMm ?? 0) - (a.sizeMm ?? 0);
      case "code":   return a.code.localeCompare(b.code, "ja");
      default:       return 0;
    }
  });
}

export function AdultTab() {
  const { beetles, reminder } = useKuwagataStore();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
  const [duplicateOf, setDuplicateOf] = useState<BeetleFormState | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [grouped, setGrouped] = useState(false);

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const searched = beetles.filter(
    (b) =>
      !search ||
      b.code.toLowerCase().includes(search.toLowerCase()) ||
      (b.name ?? "").includes(search) ||
      b.species.includes(search) ||
      (b.locality ?? "").includes(search)
  );
  const sorted = applySort(
    applyFilter(searched, activeFilters, reminder.intervalDays),
    sortKey
  );
  const selected = beetles.find((b) => b.id === selectedId);

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
          placeholder="管理番号・種類・産地でさがす"
          className="kuwa-input kuwa-input-search"
          style={{ fontSize: 14 }}
        />
      </div>

      <div className="space-y-2.5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.key}
              onClick={() => toggleFilter(f.key)}
              data-on={activeFilters.has(f.key)}
              className="kuwa-chip font-maru"
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSortKey(s.key)}
              data-on={sortKey === s.key}
              className="kuwa-chip kuwa-chip-amber font-maru"
            >
              {s.label}
            </button>
          ))}
        </div>
        {/* 何種類も飼っている人向け。種類ごとにまとめて見せる */}
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-semibold flex-shrink-0"
            style={{ color: "var(--kuwa-ink-soft)" }}
          >
            グループ化
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setGrouped(false)}
              className="kuwa-chip"
              style={{ padding: "4px 11px", fontSize: 11 }}
              data-on={!grouped}
            >
              なし
            </button>
            <button
              onClick={() => setGrouped(true)}
              className="kuwa-chip"
              style={{ padding: "4px 11px", fontSize: 11 }}
              data-on={grouped}
            >
              種類ごと
            </button>
          </div>
        </div>
      </div>

      {beetles.length > 0 && (
        <p className="text-xs px-1" style={{ color: "var(--kuwa-ink-soft)" }}>
          {sorted.length} 頭を表示中
        </p>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          image={EMPTY_IMAGE.adult}
          icon={Bug}
          color="var(--kuwa-bark)"
          title={
            search || activeFilters.size > 0
              ? "この条件に合う子はいませんでした"
              : "まだ成虫が登録されていません"
          }
          hint={
            search || activeFilters.size > 0
              ? "条件をゆるめてもう一度さがしてみましょう"
              : "右下の＋から、最初の1頭を迎え入れましょう"
          }
          // チップを1つずつ外させると、どれが効いているのか探すことになる
          action={
            search || activeFilters.size > 0
              ? {
                  label: "条件をすべて外す",
                  onClick: () => {
                    setSearch("");
                    setActiveFilters(new Set());
                  },
                }
              : undefined
          }
        />
      ) : grouped ? (
        <div className="space-y-6">
          {groupBySpecies(sorted).map((g) => (
            <section key={g.species}>
              <div className="mb-3 px-0.5 flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
                  {g.species}
                </span>
                <span className="text-xs" style={{ color: "var(--kuwa-ink-soft)" }}>
                  {g.items.length}頭
                </span>
              </div>
              <div className="space-y-3">
                {g.items.map((b, i) => (
                  <div key={b.id} className="animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                    <BeetleCard beetle={b} onClick={() => setSelectedId(b.id)} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((b, i) => (
            <div key={b.id} className="animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
              <BeetleCard beetle={b} onClick={() => setSelectedId(b.id)} />
            </div>
          ))}
        </div>
      )}

      <Fab onClick={() => setShowAdd(true)} label="成虫を登録" />

      {showAdd && (
        <AddBeetleModal
          onClose={() => {
            setShowAdd(false);
            setDuplicateOf(null);
          }}
          initial={duplicateOf ?? undefined}
        />
      )}
      {selected && (
        <BeetleDetailModal
          beetle={selected}
          onClose={() => setSelectedId(null)}
          onDuplicate={(b) => {
            setDuplicateOf(
              duplicateBeetleForm(b, SPECIES_OPTIONS, beetles.map((x) => x.code))
            );
            setSelectedId(null);
            setShowAdd(true);
          }}
        />
      )}
    </div>
  );
}
