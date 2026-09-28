"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { useToast } from "@/components/ui/Toast";
import { Accordion } from "@/components/KuwaUI";
import { LOCALITY_NAME_MAX, checkLocalityName, localityUses } from "@/lib/locality";

/**
 * 産地・血統の一覧。
 *
 * 産地は血統書にも出品リストにも刷られる。打ち間違えたまま何頭も登録すると、
 * お客さんに渡す紙に残ってしまう。ここで直すと、記録のほうも付け替わる。
 */

const ISSUE_TEXT = {
  empty: "産地を入れてください",
  "too-long": `産地は${LOCALITY_NAME_MAX}文字までにしてください`,
  same: "名前が変わっていません",
} as const;

export function LocalitySection() {
  const beetles = useKuwagataStore((s) => s.beetles);
  const renameLocality = useKuwagataStore((s) => s.renameLocality);
  const { showToast } = useToast();
  const [editing, setEditing] = useState<{ species: string; from: string; to: string } | null>(
    null
  );

  const uses = localityUses(beetles);
  if (uses.length === 0) return null;

  // 品種ごとにまとめる。localityUses が品種順に並べてある
  const bySpecies = new Map<string, typeof uses>();
  for (const u of uses) {
    const list = bySpecies.get(u.species) ?? [];
    list.push(u);
    bySpecies.set(u.species, list);
  }

  const rename = () => {
    if (editing == null) return;
    const result = checkLocalityName(editing.from, editing.to);
    if ("issue" in result) {
      showToast(ISSUE_TEXT[result.issue], "error");
      return;
    }
    const moved = renameLocality(editing.species, editing.from, result.name);
    setEditing(null);
    showToast(`${result.name} に直しました (${moved}頭)`);
  };

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--kuwa-card)", border: "1px solid var(--kuwa-line)" }}
    >
      <p className="font-maru text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
        産地・血統
      </p>
      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
        いま使っている産地です。産地は血統書にも出品リストにも刷られるので、
        打ち間違えたときはここで直してください。
        <strong style={{ color: "var(--kuwa-ink)" }}>その品種の記録もまとめて変わります。</strong>
      </p>

      <div className="mt-3 space-y-2">
        {[...bySpecies.entries()].map(([species, list]) => (
          <Accordion
            key={species}
            title={species}
            lead={`${list.length}件の産地`}
            // 品種が1つしかない人は、開く手間をかけさせない
            defaultOpen={bySpecies.size === 1}
          >
            <div className="space-y-2">
              {list.map((u) =>
                editing?.species === species && editing.from === u.name ? (
                  <div key={u.name} className="flex gap-2">
                    <input
                      value={editing.to}
                      onChange={(e) => setEditing({ ...editing, to: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") rename();
                      }}
                      maxLength={LOCALITY_NAME_MAX}
                      autoFocus
                      className="kuwa-input flex-1 min-w-0"
                    />
                    <button
                      onClick={rename}
                      aria-label={`${u.name} の名前を直す`}
                      className="kuwa-btn-ghost px-4 flex items-center justify-center flex-shrink-0 active:scale-95 transition-all"
                    >
                      <Check className="w-4 h-4" strokeWidth={2.6} />
                    </button>
                  </div>
                ) : (
                  <div
                    key={u.name}
                    className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                    style={{ border: "1px solid var(--kuwa-line)", background: "#fffdf6" }}
                  >
                    <span
                      className="text-sm min-w-0 flex-1 truncate"
                      style={{ color: "var(--kuwa-ink)" }}
                    >
                      {u.name}
                    </span>
                    <span
                      className="text-[11px] flex-shrink-0"
                      style={{ color: "var(--kuwa-ink-soft)" }}
                    >
                      {u.count}頭
                    </span>
                    <button
                      onClick={() => setEditing({ species, from: u.name, to: u.name })}
                      aria-label={`${u.name} の名前を直す`}
                      className="p-1.5 flex-shrink-0 active:scale-95 transition-all"
                      style={{ color: "var(--kuwa-ink-soft)" }}
                    >
                      <Pencil className="w-3.5 h-3.5" strokeWidth={2.2} />
                    </button>
                  </div>
                )
              )}
            </div>
          </Accordion>
        ))}
      </div>
    </div>
  );
}
