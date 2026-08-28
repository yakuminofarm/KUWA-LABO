"use client";

import { useState } from "react";
import { GitBranch } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { BreedingLine, LineStatus } from "@/types";
import {
  LINE_STATUS_COLORS,
  LINE_STATUS_LABELS,
  LINE_STATUS_ORDER,
  daysBetween,
  speciesGradient,
  totalHeads,
} from "@/lib/breeding";
import { formatDateShort } from "@/lib/utils";
import { AddLineModal } from "@/components/AddLineModal";
import { LineDetailModal } from "@/components/LineDetailModal";
import { EmptyState, Fab } from "@/components/KuwaUI";
import { EMPTY_IMAGE } from "@/lib/assets";

type StatusFilter = "all" | LineStatus;

function LineCard({ line, onClick }: { line: BreedingLine; onClick: () => void }) {
  const { beetles, getLarvaeByLine } = useKuwagataStore();
  const male = line.maleId ? beetles.find((b) => b.id === line.maleId) : undefined;
  const female = line.femaleId ? beetles.find((b) => b.id === line.femaleId) : undefined;
  const larvaeCount = totalHeads(getLarvaeByLine(line.id).filter((l) => l.isAlive));

  const elapsed =
    line.status === "laying" && line.setDate
      ? `セットから${daysBetween(line.setDate)}日`
      : line.status === "pairing" && line.pairingDate
      ? `ペアリング${daysBetween(line.pairingDate)}日目`
      : undefined;

  return (
    <button
      onClick={onClick}
      className="kuwa-card w-full text-left pl-6 pr-4 py-4 transition-all active:scale-[0.98] relative overflow-hidden"
      style={line.status === "finished" ? { opacity: 0.62 } : undefined}
    >
      <span
        className={`absolute left-0 top-0 bottom-0 w-[5px] bg-gradient-to-b ${speciesGradient(line.species)}`}
      />
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
          {line.name}
          <span className="text-xs font-medium ml-2" style={{ color: "var(--kuwa-ink-soft)" }}>
            {line.species}
          </span>
        </p>
        <span className={`kuwa-badge font-maru flex-shrink-0 ${LINE_STATUS_COLORS[line.status]}`}>
          {LINE_STATUS_LABELS[line.status]}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="font-bold truncate text-[#3f5a72]">♂ {male ? male.code : "未設定"}</span>
        <span style={{ color: "var(--kuwa-ink-soft)", opacity: 0.5 }}>×</span>
        <span className="font-bold truncate text-[#a3502f]">♀ {female ? female.code : "未設定"}</span>
      </div>

      <div
        className="flex items-center gap-3 mt-2 flex-wrap text-xs"
        style={{ color: "var(--kuwa-ink-soft)" }}
      >
        {elapsed && (
          <span className="font-bold" style={{ color: "var(--kuwa-amber)" }}>
            {elapsed}
          </span>
        )}
        {line.splitDate && <span>割り出し {formatDateShort(line.splitDate)}</span>}
        {line.larvaCount != null && <span>回収 {line.larvaCount}頭</span>}
        {larvaeCount > 0 && (
          <span className="font-bold" style={{ color: "var(--kuwa-moss)" }}>
            育成中 {larvaeCount}頭
          </span>
        )}
      </div>
    </button>
  );
}

export function BreedingTab() {
  const { lines } = useKuwagataStore();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered =
    statusFilter === "all" ? lines : lines.filter((l) => l.status === statusFilter);

  const sorted = [...filtered].sort((a, b) => {
    const activeDiff = Number(a.status === "finished") - Number(b.status === "finished");
    if (activeDiff !== 0) return activeDiff;
    return (b.pairingDate ?? "").localeCompare(a.pairingDate ?? "");
  });

  const selected = lines.find((l) => l.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        {(["all", ...LINE_STATUS_ORDER] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            data-on={statusFilter === s}
            className="kuwa-chip font-maru"
          >
            {s === "all" ? "すべて" : LINE_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          image={EMPTY_IMAGE.line}
          icon={GitBranch}
          color="var(--kuwa-bark)"
          title={
            statusFilter !== "all"
              ? "この状態のラインはまだありません"
              : "まだブリードラインがありません"
          }
          hint={
            statusFilter !== "all"
              ? "「すべて」に戻すと全部のラインが見られます"
              : "右下の＋から、ペアを組んで最初のラインを作りましょう"
          }
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((l, i) => (
            <div key={l.id} className="animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
              <LineCard line={l} onClick={() => setSelectedId(l.id)} />
            </div>
          ))}
        </div>
      )}

      <Fab onClick={() => setShowAdd(true)} label="ラインを作成" />

      {showAdd && <AddLineModal onClose={() => setShowAdd(false)} />}
      {selected && <LineDetailModal line={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
