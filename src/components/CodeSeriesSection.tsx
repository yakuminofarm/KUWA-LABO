"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { useToast } from "@/components/ui/Toast";
import {
  SERIES_MAX,
  checkSeriesName,
  knownSeries,
  seriesInUse,
  seriesLabel,
  splitCode,
} from "@/lib/codeSeries";

/**
 * 管理系統の一覧。
 *
 * 並ぶのは **使ったことのある系統と、ここで登録した系統**。使っているものは
 * 記録から分かるので登録は要らない。ここで足すのは、まだ1頭も登録していない
 * 系統を先に決めておきたいときのため。
 */

const ISSUE_TEXT = {
  empty: "系統を入れてください",
  "too-long": `系統は${SERIES_MAX}文字までにしてください`,
  "ends-with-digit": "系統の終わりは数字にできません。番号と見分けがつかなくなります",
  duplicate: "その系統はもう選べます",
} as const;

export function CodeSeriesSection() {
  const beetles = useKuwagataStore((s) => s.beetles);
  const registered = useKuwagataStore((s) => s.codeSeries);
  const addCodeSeries = useKuwagataStore((s) => s.addCodeSeries);
  const removeCodeSeries = useKuwagataStore((s) => s.removeCodeSeries);
  const { showToast } = useToast();
  const [adding, setAdding] = useState("");

  const series = knownSeries(beetles, registered);

  const add = () => {
    const result = checkSeriesName(adding, series);
    if ("issue" in result) {
      showToast(ISSUE_TEXT[result.issue], "error");
      return;
    }
    addCodeSeries(result.name);
    setAdding("");
    showToast(`${result.name} を足しました`);
  };

  const count = (s: string) => beetles.filter((b) => splitCode(b.code)?.series === s).length;

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--kuwa-card)", border: "1px solid var(--kuwa-line)" }}
    >
      <p className="font-maru text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
        管理系統
      </p>
      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
        管理番号の「25OK-A3」でいう <strong style={{ color: "var(--kuwa-ink)" }}>25OK-A</strong>{" "}
        の部分です。登録画面では、ここから選んで番号だけを入れられます。
        いちど使った系統は自動で並ぶので、足すのは先に決めておきたいときだけで大丈夫です。
      </p>

      {series.length > 0 && (
        <div className="mt-3 space-y-2">
          {series.map((name) => {
            const used = count(name);
            return (
              <div
                key={name}
                className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                style={{ border: "1px solid var(--kuwa-line)", background: "#fffdf6" }}
              >
                <span
                  className="text-sm font-bold min-w-0 flex-1 truncate"
                  style={{ color: "var(--kuwa-ink)" }}
                >
                  {seriesLabel(name)}
                </span>
                <span className="text-[11px] flex-shrink-0" style={{ color: "var(--kuwa-ink-soft)" }}>
                  {used > 0 ? `${used}頭` : "まだ使っていません"}
                </span>
                {/* 使っている系統は外せない。外しても記録の番号は変わらないが、
                    一覧から消えると選び直せなくなる */}
                {!seriesInUse(name, beetles) && (
                  <button
                    onClick={() => {
                      removeCodeSeries(name);
                      showToast(`${name} を外しました`);
                    }}
                    aria-label={`${name} を一覧から外す`}
                    className="p-1.5 flex-shrink-0 active:scale-95 transition-all"
                    style={{ color: "var(--kuwa-clay)" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="例: 26OK-A"
          maxLength={SERIES_MAX}
          className="kuwa-input flex-1 min-w-0"
        />
        <button
          onClick={add}
          disabled={adding.trim() === ""}
          aria-label="管理系統を足す"
          className="kuwa-btn-ghost px-4 flex items-center justify-center flex-shrink-0 active:scale-95 transition-all disabled:opacity-40"
        >
          <Plus className="w-4 h-4" strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
