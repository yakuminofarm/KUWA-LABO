"use client";

import { useMemo, useState } from "react";
import { HeartHandshake, Plus } from "lucide-react";
import { Candidate, Caution, pairingCandidates, suggestLineName } from "@/lib/pairing";
import { Relation } from "@/lib/relation";
import { Beetle, BreedingLine, Larva } from "@/types";
import { useSpeciesOptions } from "@/store/useSpeciesOptions";
import { AddLineModal } from "@/components/AddLineModal";

/**
 * 組める相手の候補。
 *
 * 血統・種親としての成績・血のつながりは別々の欄に出ているが、
 * 「次はどれと組むか」を決めるにはその3つを同時に見ることになる。
 * ここで1頭を起点に並べ、そのまま組めるところまで繋ぐ。
 *
 * 勧める順はあるが、**選ぶのは飼っている人**。血が近い相手も消さずに残し、
 * 気をつけることを添えるだけにしてある (兄妹掛けは形を固める正当なやり方)。
 */
const SHOWN = 3;

function relationLabel(r: Relation): string {
  switch (r.kind) {
    case "same":
      return "同じ個体";
    case "parent-child":
      return "親子";
    case "direct":
      return "直系";
    case "siblings":
      return "兄妹";
    case "half-siblings":
      return "片親が同じ";
    case "shared-ancestor":
      return "共通の祖先あり";
    case "unrelated":
      // 血縁が無いことは証明できない (買ってきた個体には親の記録が無い)。
      // 「（記録上）」を添えて、手元の記録の範囲の話だと分かるようにする
      return "血縁関係なし（記録上）";
  }
}

const CAUTION_TEXT: Record<Caution, string> = {
  "close-blood": "血が近いので、続けるなら小型化に気をつけて",
  "different-locality": "産地が違うので、混ぜたくないときは避けて",
  "not-matured": "まだ後食していないので、すぐには組めません",
};

function Row({
  candidate,
  onPair,
}: {
  candidate: Candidate;
  onPair: (other: Beetle) => void;
}) {
  const b = candidate.beetle;
  const close = candidate.cautions.includes("close-blood");
  const male = b.gender === "male";

  return (
    <div
      className="rounded-xl px-3.5 py-3"
      style={{ background: "var(--kuwa-bark-bg)", border: "1px solid var(--kuwa-line)" }}
    >
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
          style={{
            background: male ? "rgba(58,110,165,0.14)" : "rgba(163,80,110,0.14)",
            color: male ? "#2f5f92" : "#8e3f63",
          }}
        >
          {male ? "♂" : "♀"}
        </span>
        <span className="text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
          {b.code || "番号なし"}
        </span>
        {b.name && (
          <span className="text-xs" style={{ color: "var(--kuwa-ink-soft)" }}>
            「{b.name}」
          </span>
        )}
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-auto flex-shrink-0"
          style={
            close
              ? { background: "var(--kuwa-amber-soft)", color: "#8a5410" }
              : { background: "var(--kuwa-card)", color: "var(--kuwa-ink-soft)" }
          }
        >
          {relationLabel(candidate.relation)}
        </span>
      </div>

      <p className="text-[11px] mt-1" style={{ color: "var(--kuwa-ink-soft)" }}>
        {[
          b.locality,
          b.generation,
          b.sizeMm != null ? `${b.sizeMm}mm` : undefined,
          candidate.bestOffspringMm != null ? `子の最大 ${candidate.bestOffspringMm}mm` : undefined,
        ]
          .filter(Boolean)
          .join(" ・ ")}
      </p>

      {candidate.cautions.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {candidate.cautions.map((c) => (
            <li key={c} className="text-[11px] leading-relaxed" style={{ color: "#8a5410" }}>
              {CAUTION_TEXT[c]}
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => onPair(b)}
        className="kuwa-btn-ghost w-full mt-2.5 py-2 text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
        この2頭で組む
      </button>
    </div>
  );
}

export function PairingSection({
  beetle,
  beetles,
  lines,
  larvae,
}: {
  beetle: Beetle;
  beetles: Beetle[];
  lines: BreedingLine[];
  larvae: Larva[];
}) {
  const speciesOptions = useSpeciesOptions();
  const [expanded, setExpanded] = useState(false);
  const [pairWith, setPairWith] = useState<Beetle | null>(null);

  const candidates = useMemo(
    () => pairingCandidates(beetle, beetles, lines, larvae),
    [beetle, beetles, lines, larvae]
  );

  // 売った個体・死んだ個体、性別が分からない個体では出す意味がない
  if (!beetle.isAlive || beetle.soldPriceYen != null || beetle.gender === "unknown") return null;

  const shown = expanded ? candidates : candidates.slice(0, SHOWN);

  const openPairing = (other: Beetle) => setPairWith(other);
  const male = beetle.gender === "male" ? beetle : pairWith;
  const female = beetle.gender === "male" ? pairWith : beetle;
  const known = speciesOptions.includes(beetle.species);

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--kuwa-card)", border: "1px solid var(--kuwa-line)" }}
    >
      <p
        className="font-maru text-sm font-bold flex items-center gap-1.5"
        style={{ color: "var(--kuwa-ink)" }}
      >
        <HeartHandshake className="w-4 h-4" strokeWidth={2.2} />
        組める相手
      </p>

      {candidates.length === 0 ? (
        <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
          同じ種類で、手元にいる{beetle.gender === "male" ? "メス" : "オス"}がまだいません。
          別の種類との掛け合わせは候補に出していません。
        </p>
      ) : (
        <>
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
            いま組めるか・血の遠さ・産地・これまでの成績・体長の順で並べています。
            決めるのは飼っている人なので、血の近い相手も残してあります。
          </p>

          <div className="mt-2.5 space-y-2">
            {shown.map((c) => (
              <Row key={c.beetle.id} candidate={c} onPair={openPairing} />
            ))}
          </div>

          {candidates.length > SHOWN && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-bold mt-2.5 py-1"
              style={{ color: "var(--kuwa-bark)" }}
            >
              {expanded ? "上の3頭だけ見る" : `ほかの${candidates.length - SHOWN}頭も見る`}
            </button>
          )}
        </>
      )}

      {pairWith && (
        <AddLineModal
          onClose={() => setPairWith(null)}
          initial={{
            name: suggestLineName(lines),
            species: known ? beetle.species : "その他",
            customSpecies: known ? "" : beetle.species,
            maleId: male?.id ?? "",
            femaleId: female?.id ?? "",
          }}
        />
      )}
    </div>
  );
}
