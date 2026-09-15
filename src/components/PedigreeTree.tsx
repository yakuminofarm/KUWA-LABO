"use client";

import { PEDIGREE_DEPTH, Pedigree, roleLabel } from "@/lib/pedigree";
import { Beetle } from "@/types";

/**
 * 血統図。左に本人、右へさかのぼって親・祖父母が枝分かれする。
 *
 * 一覧 (`PedigreeSection` の字下げ表示) と同じ中身を、形で見せる。
 * 「どちらの系統から来た血か」は、並んだ字より枝を見たほうが早い。
 *
 * 390pxの画面に3世代を収めると1枠が読めない大きさになるので、**横に流す**。
 * 枠の幅は決め打ちで、画面に入らないぶんは指で送る。縮めて全部見せると
 * 管理番号が読めず、図の意味がなくなる。
 *
 * 記録の無い先祖は枠を出さない。自分の記録を見ている画面なので、空枠が
 * 並んでも分かることが増えない (人に渡す血統書のほうは、家系のどこが
 * 分かっていないかを伝える必要があるので空枠を出す)。
 */
const BOX_W = 132;
/** 枝の横棒のぶん */
const ARM = 16;
const LINE = "1px solid var(--kuwa-line)";

function Box({ beetle, depth, male }: { beetle: Beetle; depth: number; male: boolean }) {
  const self = depth === 0;
  return (
    <div
      className="rounded-xl px-2.5 py-2"
      style={{
        width: BOX_W,
        background: self ? "var(--kuwa-bark-bg)" : "var(--kuwa-card)",
        border: LINE,
      }}
    >
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded-md inline-block"
        style={
          self
            ? { background: "rgba(36,26,17,0.14)", color: "var(--kuwa-ink)" }
            : male
            ? { background: "rgba(58,110,165,0.14)", color: "#2f5f92" }
            : { background: "rgba(163,80,110,0.14)", color: "#8e3f63" }
        }
      >
        {self ? "この子" : `${male ? "♂" : "♀"} ${roleLabel(depth, male)}`}
      </span>
      <p
        className="text-xs font-bold mt-1 truncate"
        style={{ color: "var(--kuwa-ink)" }}
        title={beetle.code}
      >
        {beetle.code || "番号なし"}
      </p>
      <p className="text-[10px] truncate" style={{ color: "var(--kuwa-ink-soft)" }}>
        {[beetle.generation, beetle.sizeMm != null ? `${beetle.sizeMm}mm` : undefined]
          .filter(Boolean)
          .join(" ・ ") || "—"}
      </p>
    </div>
  );
}

function Node({ node, depth, male }: { node: Pedigree; depth: number; male: boolean }) {
  // 記録のある親だけを枝にする
  const parents: { node: Pedigree; male: boolean }[] = [];
  if (depth + 1 < PEDIGREE_DEPTH) {
    if (node.father) parents.push({ node: node.father, male: true });
    if (node.mother) parents.push({ node: node.mother, male: false });
  }

  return (
    <div className="flex items-center">
      <Box beetle={node.beetle} depth={depth} male={male} />

      {parents.length > 0 && (
        <>
          {/* 枝の根元。枠から縦線まで引く */}
          <span style={{ width: ARM, borderTop: LINE, flexShrink: 0 }} />
          <div className="flex flex-col" style={{ flexShrink: 0 }}>
            {parents.map((p, i) => {
              // 縦線は「上の枠の中心から下の枠の中心まで」。端まで引くと、
              // 枝の外へ線がはみ出して図がちらつく。
              // 上下の余白は gap ではなく padding にして、線を途切れさせない
              const first = i === 0;
              const last = i === parents.length - 1;
              return (
                <div
                  key={p.node.beetle.id}
                  className="flex items-center relative"
                  style={{ paddingTop: 5, paddingBottom: 5 }}
                >
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: 0,
                      top: first ? "50%" : 0,
                      bottom: last ? "50%" : 0,
                      borderLeft: LINE,
                    }}
                  />
                  {/* 縦線から次の枠へ */}
                  <span style={{ width: ARM, borderTop: LINE, flexShrink: 0 }} />
                  <Node node={p.node} depth={depth + 1} male={p.male} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function PedigreeTree({ pedigree }: { pedigree: Pedigree }) {
  return (
    <div>
      {/* 画面に入らないぶんは横に送る。縮めると管理番号が読めない */}
      <div className="overflow-x-auto pb-1">
        <div className="inline-block py-1">
          <Node node={pedigree} depth={0} male={pedigree.beetle.gender === "male"} />
        </div>
      </div>
      <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
        右へ行くほど前の世代です。指で横に送れます。記録のある先祖だけを出しています。
      </p>
    </div>
  );
}
