"use client";

import { Info } from "lucide-react";
import { Relation, isClose, relationOf } from "@/lib/relation";
import { Beetle, BreedingLine } from "@/types";

/**
 * 組もうとしているペアの間柄を、組む前に知らせる。
 *
 * 兄妹掛け・親子掛けは形を固めるための普通のやり方なので、止めにはいかない。
 * 「そうと知って組んでいるか」を確かめられれば足りる。
 */
function describe(r: Relation): { title: string; detail?: string } | null {
  switch (r.kind) {
    case "same":
      return { title: "同じ個体です", detail: "♂と♀に別の個体を選んでください。" };
    case "parent-child":
      return {
        title: "親子です",
        detail: `${r.parent.code} は ${r.child.code} の親にあたります。`,
      };
    case "direct":
      return {
        title: "直系です",
        detail: `${r.descendant.code} は ${r.ancestor.code} の子孫にあたります。`,
      };
    case "siblings":
      return { title: "兄妹です", detail: "同じ親から採れた2頭です。" };
    case "half-siblings":
      return {
        title: "片親が同じです",
        detail: `どちらも ${r.shared.code} の子です。`,
      };
    case "shared-ancestor":
      return {
        title: "共通の祖先がいます",
        detail: `${r.shared.map((b) => b.code).join("・")} が両方の家系に出てきます。`,
      };
    case "unrelated":
      // 「繋がりが無い」と言い切れるだけの記録は無い。黙っているほうが誠実
      return null;
  }
}

export function RelationNotice({
  maleId,
  femaleId,
  beetles,
  lines,
}: {
  maleId?: string;
  femaleId?: string;
  beetles: Beetle[];
  lines: BreedingLine[];
}) {
  const male = maleId ? beetles.find((b) => b.id === maleId) : undefined;
  const female = femaleId ? beetles.find((b) => b.id === femaleId) : undefined;
  if (!male || !female) return null;

  const relation = relationOf(male, female, beetles, lines);
  const text = describe(relation);
  if (!text) return null;

  const close = isClose(relation);

  return (
    <div
      className="rounded-xl px-3.5 py-3 flex items-start gap-2.5"
      style={
        close
          ? { background: "var(--kuwa-amber-soft)", border: "1px solid rgba(163,102,15,0.3)" }
          : { background: "var(--kuwa-bark-bg)", border: "1px solid var(--kuwa-line)" }
      }
    >
      <Info
        className="w-4 h-4 flex-shrink-0 mt-0.5"
        strokeWidth={2.2}
        style={{ color: close ? "#8a5410" : "var(--kuwa-ink-soft)" }}
      />
      <div className="min-w-0">
        <p className="text-xs font-bold" style={{ color: "var(--kuwa-ink)" }}>
          この2頭は{text.title}
        </p>
        {text.detail && (
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
            {text.detail}
          </p>
        )}
        {close && relation.kind !== "same" && (
          <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
            形を固めたいときによく使う組み方です。続けると小型化や産まないことが
            起きやすくなるので、どこかで血を入れ替える目安にしてください。
          </p>
        )}
      </div>
    </div>
  );
}
