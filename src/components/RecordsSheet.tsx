"use client";

import { Trophy } from "lucide-react";
import { Sheet } from "@/components/KuwaUI";
import { SpeciesAvatar } from "@/components/KuwagataSVG";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { Beetle } from "@/types";
import { isSelfReared, speciesRecords } from "@/lib/breeding";

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

export function RecordsSheet({ onClose }: { onClose: () => void }) {
  const beetles = useKuwagataStore((s) => s.beetles);
  const records = speciesRecords(beetles);

  return (
    <Sheet title="自己ベスト" onClose={onClose}>
      {records.length === 0 ? (
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
            成虫に体長を入れると、種類ごとの自己ベストがここに並びます。
          </p>
        </div>
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
      )}

      <p className="text-xs leading-relaxed mt-5" style={{ color: "var(--kuwa-ink-soft)" }}>
        飼育品と野外品は育て方の話がまったく違うので、分けて数えています。
        累代が WD のものを野外品として扱います。
        譲り受けた個体を自分の記録にしたくないときは、その子の詳細から外せます。
      </p>
    </Sheet>
  );
}
