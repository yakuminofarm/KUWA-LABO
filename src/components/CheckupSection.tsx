"use client";

import { AlertTriangle } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { Finding, checkup } from "@/lib/checkup";

/**
 * 記録の点検。
 *
 * 名前を直す道具をそろえても、**どれが直すべきものかは自分では気づけない**。
 * 見つけたものを並べるだけで、勝手には直さない — 似ているだけで別物のことが
 * あるため。
 *
 * **何も見つからなければ、何も出さない。** ふだんの設定画面を、点検のために
 * 長くしない。
 */

const TITLE: Record<Finding["kind"], string> = {
  "duplicate-code": "同じ管理番号の子がいます",
  species: "品種の書き方が分かれています",
  series: "管理系統の書き方が分かれています",
  locality: "産地の書き方が分かれています",
};

const WHY: Record<Finding["kind"], string> = {
  "duplicate-code": "ラベルを読んでも、どちらの子か分かりません",
  species: "書き方が違うと、目安も、組める相手の候補も分かれてしまいます",
  series: "同じ系統のつもりでも、番号の続きが別々に振られます",
  locality: "血統書や出品リストに、違う産地として並びます",
};

export function CheckupSection() {
  const beetles = useKuwagataStore((s) => s.beetles);
  const larvae = useKuwagataStore((s) => s.larvae);
  const lines = useKuwagataStore((s) => s.lines);

  const found = checkup(beetles, larvae, lines);
  if (found.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--kuwa-card)", border: "1px solid rgba(163,80,47,0.35)" }}
    >
      <p
        className="font-maru text-sm font-bold flex items-center gap-2"
        style={{ color: "var(--kuwa-clay)" }}
      >
        <AlertTriangle className="w-4 h-4" strokeWidth={2.4} />
        気になる記録が{found.length}件
      </p>
      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
        書き方が分かれているかもしれない記録です。
        <strong style={{ color: "var(--kuwa-ink)" }}>似ているだけで別物のこともある</strong>
        ので、こちらでは直しません。直すかどうかは見て決めてください。
      </p>

      <div className="mt-3 space-y-2">
        {found.map((f, i) => (
          <div
            key={`${f.kind}-${i}`}
            className="rounded-xl px-3 py-2.5"
            style={{ border: "1px solid var(--kuwa-line)", background: "#fffdf6" }}
          >
            <p className="text-xs font-bold" style={{ color: "var(--kuwa-ink)" }}>
              {TITLE[f.kind]}
            </p>
            <p className="text-sm mt-1 font-bold" style={{ color: "var(--kuwa-clay)" }}>
              {f.values.join(" ／ ")}
              <span
                className="text-[11px] font-semibold ml-2"
                style={{ color: "var(--kuwa-ink-soft)" }}
              >
                {f.count}件
              </span>
            </p>
            <p
              className="text-[11px] mt-1 leading-relaxed"
              style={{ color: "var(--kuwa-ink-soft)" }}
            >
              {WHY[f.kind]}。{f.where}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
