"use client";

import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { Sheet } from "@/components/KuwaUI";
import { useToast } from "@/components/ui/Toast";
import {
  ListKind,
  SaleRow,
  buildSaleList,
  rowsPerPage,
  saleListFileName,
  saleRow,
} from "@/lib/saleSheet";
import { paginate } from "@/lib/labelSheet";
import { ShareImage, shareCardImages } from "@/lib/share";

/**
 * 出品リストを選んで書き出す画面。
 *
 * 並べるのは**手元にいる成虫だけ**。売った個体と飼育を終えた個体は出さない
 * (卓に並べられない)。幼虫はまだ入れていない — 即売会ではラインごとに
 * まとめて出すことが多く、1頭ずつの表とは形が違う。
 */
const KIND_LABEL: Record<ListKind, string> = {
  handout: "配布用 (金額なし)",
  mine: "手元用 (原価入り)",
};

export function SaleListSheet({ onClose }: { onClose: () => void }) {
  const { beetles, larvae } = useKuwagataStore();
  const { showToast } = useToast();
  const [kind, setKind] = useState<ListKind>("handout");
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const rows = useMemo(
    () =>
      beetles
        .filter((b) => b.isAlive && b.soldPriceYen == null)
        .map((b) => ({ id: b.id, row: saleRow(b, larvae) })),
    [beetles, larvae]
  );

  const chosen: SaleRow[] = rows.filter((r) => picked.has(r.id)).map((r) => r.row);
  const pages = paginate(chosen, rowsPerPage(kind)).length;

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.id));
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.id)));

  const exportList = async () => {
    if (chosen.length === 0) return;
    setBusy(true);
    try {
      const sheets = buildSaleList(chosen, kind, {
        title: title || undefined,
        issuedOn: new Date().toISOString().slice(0, 10),
      });
      const images: ShareImage[] = sheets.map((dataUrl, i) => ({
        dataUrl,
        fileName: saleListFileName(kind, i, sheets.length),
      }));
      const result = await shareCardImages(images, `出品リスト ${chosen.length}頭`);
      if (result === "saved") showToast("出品リストを保存しました");
      else if (result === "failed") showToast("出品リストを書き出せませんでした", "error");
    } catch {
      showToast("出品リストを書き出せませんでした", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="出品リストを作る" onClose={onClose}>
      <div>
        <p className="text-sm font-medium mb-2" style={{ color: "var(--kuwa-ink)" }}>
          どちらを作りますか
        </p>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(KIND_LABEL) as ListKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              data-on={kind === k}
              className="kuwa-chip font-maru"
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        {kind === "mine" && (
          <p className="text-[11px] mt-2 leading-relaxed" style={{ color: "var(--kuwa-clay)" }}>
            原価 (入手金額、自分で羽化させた個体は育成費用) が入ります。
            値切られたときに下げてよい線を見るためのもので、お客さんに渡す紙ではありません。
            紙の上にもその断りが入ります。
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: "var(--kuwa-ink)" }}>
          見出し
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 2026 秋 即売会"
          className="kuwa-input"
        />
      </div>

      {rows.length === 0 ? (
        <p className="text-xs leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
          並べられる成虫がいません。売った個体や飼育を終えた個体は出していません。
        </p>
      ) : (
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: "var(--kuwa-ink)" }}>
              並べるもの ({chosen.length}/{rows.length})
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
                      {r.row.code}
                      <span className="text-xs font-medium ml-1.5" style={{ color: "var(--kuwa-ink-soft)" }}>
                        {r.row.gender}
                      </span>
                    </span>
                    <span className="text-[11px] block truncate" style={{ color: "var(--kuwa-ink-soft)" }}>
                      {[r.row.species, r.row.locality, r.row.generation, r.row.size && `${r.row.size}mm`]
                        .filter(Boolean)
                        .join(" ・ ")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[11px] leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
        A4の表にして書き出します。値段の欄は作っていません — 当日の値付けは
        手書きのほうが早く、書き換えもききます。幼虫はまだ並べられません。
      </p>

      <button
        onClick={exportList}
        disabled={chosen.length === 0 || busy}
        className="kuwa-btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-40"
      >
        <FileText className="w-4 h-4" strokeWidth={2.4} />
        {busy
          ? "作っています…"
          : chosen.length === 0
          ? "並べるものを選んでください"
          : `出品リストを書き出す (A4 ${pages}枚)`}
      </button>
    </Sheet>
  );
}
