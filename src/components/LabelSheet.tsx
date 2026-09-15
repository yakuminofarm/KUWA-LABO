"use client";

import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { Sheet } from "@/components/KuwaUI";
import { useToast } from "@/components/ui/Toast";
import {
  LABEL_GRIDS,
  LabelItem,
  LabelSize,
  beetleLabel,
  buildLabelSheets,
  labelFileName,
  larvaLabel,
  paginate,
  perSheet,
} from "@/lib/labelSheet";
import { ShareImage, shareCardImages } from "@/lib/share";

/**
 * 管理ラベルを選んで書き出す画面。
 *
 * ケースやビンに貼る紙を作るためのもの。刷ったあと直せないので、
 * **いま手元にいるものだけ** を並べる (売った個体・飼育を終えた個体・
 * 成虫へ引き上げた幼虫は出さない)。貼る先がもう無い。
 */
type Target = "beetles" | "larvae";

const TARGET_LABEL: Record<Target, string> = {
  beetles: "成虫",
  larvae: "幼虫・蛹",
};

export function LabelSheet({ onClose }: { onClose: () => void }) {
  const { beetles, larvae, lines } = useKuwagataStore();
  const { showToast } = useToast();
  const [target, setTarget] = useState<Target>("larvae");
  const [size, setSize] = useState<LabelSize>("small");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  // 貼る先があるものだけ
  const rows = useMemo(() => {
    if (target === "beetles") {
      return beetles
        .filter((b) => b.isAlive && b.soldPriceYen == null)
        .map((b) => ({ id: b.id, item: beetleLabel(b) }));
    }
    return larvae
      .filter((l) => l.isAlive && l.promotedBeetleId == null)
      .map((l) => ({ id: l.id, item: larvaLabel(l, lines) }));
  }, [target, beetles, larvae, lines]);

  const chosen: LabelItem[] = rows.filter((r) => picked.has(r.id)).map((r) => r.item);
  const pages = paginate(chosen, perSheet(size)).length;

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.id));
  const toggleAll = () => {
    if (allPicked) {
      const next = new Set(picked);
      for (const r of rows) next.delete(r.id);
      setPicked(next);
    } else {
      setPicked(new Set([...picked, ...rows.map((r) => r.id)]));
    }
  };

  const exportLabels = async () => {
    if (chosen.length === 0) return;
    setBusy(true);
    try {
      const sheets = buildLabelSheets(chosen, size);
      const images: ShareImage[] = sheets.map((dataUrl, i) => ({
        dataUrl,
        fileName: labelFileName(i, sheets.length),
      }));
      const result = await shareCardImages(images, `管理ラベル ${chosen.length}面`);
      if (result === "saved") showToast("ラベルを保存しました");
      else if (result === "failed") showToast("ラベルを書き出せませんでした", "error");
      // shared と cancelled は本人に見えているので何も言わない
    } catch {
      showToast("ラベルを書き出せませんでした", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="管理ラベルを作る" onClose={onClose}>
      <div className="flex gap-2">
        {(Object.keys(TARGET_LABEL) as Target[]).map((t) => (
          <button
            key={t}
            onClick={() => setTarget(t)}
            data-on={target === t}
            className="kuwa-chip font-maru"
          >
            {TARGET_LABEL[t]}
          </button>
        ))}
      </div>

      <div>
        <p className="text-sm font-medium mb-2" style={{ color: "var(--kuwa-ink)" }}>
          ラベルの大きさ
        </p>
        <div className="flex gap-2">
          {(Object.keys(LABEL_GRIDS) as LabelSize[]).map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              data-on={size === s}
              className="kuwa-chip font-maru"
            >
              {LABEL_GRIDS[s].label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
          貼る先のある{TARGET_LABEL[target]}がいません。
          売った個体や飼育を終えた個体は出していません。
        </p>
      ) : (
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: "var(--kuwa-ink)" }}>
              貼るもの ({chosen.length}/{rows.length})
            </p>
            <button
              onClick={toggleAll}
              className="text-xs font-bold py-1"
              style={{ color: "var(--kuwa-bark)" }}
            >
              {allPicked ? "選択を外す" : "すべて選ぶ"}
            </button>
          </div>

          <div className="mt-2 space-y-1.5">
            {rows.map((r) => {
              const on = picked.has(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => toggle(r.id)}
                  className="w-full text-left rounded-xl px-3 py-2.5 flex items-start gap-2.5 active:scale-[0.99] transition-all"
                  style={{
                    background: on ? "var(--kuwa-bark-bg)" : "var(--kuwa-card)",
                    border: `1px solid ${on ? "var(--kuwa-bark)" : "var(--kuwa-line)"}`,
                  }}
                >
                  <span
                    className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{
                      background: on ? "var(--kuwa-bark)" : "transparent",
                      border: on ? "none" : "1px solid var(--kuwa-line)",
                      color: "#fdf6e7",
                    }}
                  >
                    {on && (
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="text-sm font-bold block truncate" style={{ color: "var(--kuwa-ink)" }}>
                      {r.item.code}
                    </span>
                    <span className="text-[11px] block truncate" style={{ color: "var(--kuwa-ink-soft)" }}>
                      {r.item.lines.join(" ・ ")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[11px] leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
        A4に等間隔で並べた画像を作ります。普通紙に刷って切り取る形なので、
        市販のラベル用紙の枠には合わせていません (品番ごとに余白が違うため)。
        次のビン交換の目安などの予定は入れません — 紙は貼ったあと直せないので、
        予定が変わると嘘になります。
      </p>

      <button
        onClick={exportLabels}
        disabled={chosen.length === 0 || busy}
        className="kuwa-btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-40"
      >
        <Printer className="w-4 h-4" strokeWidth={2.4} />
        {busy
          ? "作っています…"
          : chosen.length === 0
          ? "貼るものを選んでください"
          : `ラベルを書き出す (A4 ${pages}枚)`}
      </button>
    </Sheet>
  );
}
