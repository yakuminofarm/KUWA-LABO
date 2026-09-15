"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Pedigree, hasParents, pedigreeOf, roleLabel } from "@/lib/pedigree";
import { PedigreeTree } from "@/components/PedigreeTree";
import { Beetle, BreedingLine } from "@/types";
import { buildPedigreeCert, certText } from "@/lib/pedigreeCert";
import { cardFileName, shareCardImage } from "@/lib/share";
import { photoSrc } from "@/lib/photoStore";
import { mainPhotoRef } from "@/lib/photoRef";
import { useToast } from "@/components/ui/Toast";

/**
 * 血統の欄。
 *
 * 390pxの画面に図で家系を描くと、3世代目には1つの枠が50pxを切って読めない。
 * そこで「字下げした一覧」にしてある。分かっている親だけが並ぶので、
 * 片親しか記録していなくても崩れない。
 */
/** 種類・産地・累代。分かっているものだけを中黒で繋ぐ */
function subtitle(b: Beetle): string {
  return [b.species, b.locality, b.generation].filter(Boolean).join(" ・ ");
}

function Row({ node, depth, male }: { node: Pedigree; depth: number; male: boolean }) {
  const b = node.beetle;
  return (
    <>
      <div
        className="flex items-baseline gap-2 py-1.5"
        style={{
          paddingLeft: `${(depth - 1) * 14}px`,
          borderLeft: depth > 1 ? "1px solid var(--kuwa-line)" : undefined,
          marginLeft: depth > 1 ? "6px" : undefined,
        }}
      >
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
          style={{
            background: male ? "rgba(58,110,165,0.14)" : "rgba(163,80,110,0.14)",
            color: male ? "#2f5f92" : "#8e3f63",
          }}
        >
          {male ? "♂" : "♀"} {roleLabel(depth, male)}
        </span>
        <span className="min-w-0">
          <span className="text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
            {b.code || "番号なし"}
          </span>
          {b.name && (
            <span className="text-xs ml-1" style={{ color: "var(--kuwa-ink-soft)" }}>
              「{b.name}」
            </span>
          )}
          <span className="block text-[11px] leading-snug" style={{ color: "var(--kuwa-ink-soft)" }}>
            {subtitle(b)}
          </span>
        </span>
      </div>

      {node.father && <Row node={node.father} depth={depth + 1} male />}
      {node.mother && <Row node={node.mother} depth={depth + 1} male={false} />}
    </>
  );
}

export function PedigreeSection({
  beetle,
  beetles,
  lines,
}: {
  beetle: Beetle;
  beetles: Beetle[];
  lines: BreedingLine[];
}) {
  const { showToast } = useToast();
  const [making, setMaking] = useState(false);
  // 既定は図。どちらの系統から来た血かは、並んだ字より枝を見たほうが早い
  const [view, setView] = useState<"tree" | "list">("tree");
  const pedigree = pedigreeOf(beetle, beetles, lines);

  // 買ってきた個体は出身ラインが無く、親をたどれない。
  // 空の欄を出すより、何も出さないほうがよい
  if (!hasParents(pedigree)) return null;

  const exportCert = async () => {
    setMaking(true);
    try {
      const main = mainPhotoRef(beetle);
      const src = main.photoUrl ?? (main.photoId ? await photoSrc(main.photoId, "full") : undefined);
      const sheet = await buildPedigreeCert(pedigree, { photoSrc: src });
      const result = await shareCardImage(
        sheet,
        cardFileName(beetle.code, "pedigree"),
        certText(beetle)
      );
      if (result === "saved") showToast("血統書を保存しました");
      else if (result === "failed") showToast("血統書を書き出せませんでした", "error");
      // shared と cancelled は本人に見えているので何も言わない
    } catch {
      showToast("血統書を書き出せませんでした", "error");
    } finally {
      setMaking(false);
    }
  };

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--kuwa-card)", border: "1px solid var(--kuwa-line)" }}
    >
      <p className="font-maru text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
        血統
      </p>
      {pedigree.line && (
        <p className="text-xs mt-1" style={{ color: "var(--kuwa-ink-soft)" }}>
          {pedigree.line.name} から採れた子です
        </p>
      )}

      <div className="flex gap-2 mt-2.5">
        {(
          [
            ["tree", "図で見る"],
            ["list", "一覧で見る"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            data-on={view === key}
            className="kuwa-chip font-maru"
            style={{ fontSize: 12, padding: "6px 12px" }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-2.5">
        {view === "tree" ? (
          <PedigreeTree pedigree={pedigree} />
        ) : (
          <>
            {pedigree.father && <Row node={pedigree.father} depth={1} male />}
            {pedigree.mother && <Row node={pedigree.mother} depth={1} male={false} />}
          </>
        )}
      </div>

      <button
        onClick={exportCert}
        disabled={making}
        className="kuwa-btn-ghost w-full mt-3 py-2.5 text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-40"
      >
        <FileDown className="w-4 h-4" strokeWidth={2.2} />
        {making ? "血統書を作っています…" : "血統書を書き出す"}
      </button>

      <p className="text-[11px] mt-2.5 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
        幼虫から成虫へ引き上げたときの出身ラインから、さかのぼって出しています。
        手元から消した個体は出てきません。書き出した血統書は自分の記録を写したもので、
        第三者の証明ではありません。
      </p>
    </div>
  );
}
