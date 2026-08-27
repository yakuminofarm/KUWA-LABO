"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ClipboardCopy,
  Download,
  FolderOpen,
  Image as ImageIcon,
  Save,
} from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { Sheet } from "@/components/KuwaUI";
import { useToast } from "@/components/ui/Toast";
import {
  BackupParseError,
  ParseResult,
  backupFileName,
  buildBackup,
  byteLength,
  formatBytes,
  parseBackup,
} from "@/lib/backup";
import { ViewerSave, getViewerSave, saveTextFile } from "@/lib/download";
import { buildInventoryCsv, csvFileName } from "@/lib/csv";
import { FileSpreadsheet } from "lucide-react";

/** 取り込み待ちのファイル (中身を見せてから、どう入れるか選んでもらう) */
type Pending = ParseResult & { fileName: string };

function Row({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs" style={{ color: "var(--kuwa-ink-soft)" }}>
        {label}
      </span>
      <span
        className="font-maru text-sm font-bold"
        style={{ color: "var(--kuwa-ink)", fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </span>
    </div>
  );
}

export function BackupSheet({ onClose }: { onClose: () => void }) {
  const snapshot = useKuwagataStore((s) => s.snapshot);
  const lines = useKuwagataStore((s) => s.lines);
  const replaceAll = useKuwagataStore((s) => s.replaceAll);
  const mergeAll = useKuwagataStore((s) => s.mergeAll);
  const { showToast } = useToast();

  const [withPhotos, setWithPhotos] = useState(true);
  const [pending, setPending] = useState<Pending | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  // 共有ページでは閲覧側の保存ダイアログ経由でないとファイルを渡せない
  const [viewerSave, setViewerSave] = useState<ViewerSave | null>(null);

  useEffect(() => {
    let alive = true;
    getViewerSave().then((fn) => {
      if (alive) setViewerSave(() => fn);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 写真を含めるかで大きさが変わるので、都度作り直して実サイズを見せる
  const json = useMemo(() => {
    const file = buildBackup(snapshot(), withPhotos);
    const text = JSON.stringify(file, null, 2);
    return { text, size: byteLength(text), counts: file.counts };
  }, [snapshot, withPhotos]);

  const total =
    json.counts.beetles + json.counts.lines + json.counts.larvae + json.counts.expenses;

  const save = async () => {
    const result = await saveTextFile(viewerSave, backupFileName(), json.text);
    if (result === "saved") showToast("バックアップを書き出しました");
    else if (result === "failed")
      showToast("保存できませんでした。コピーの方をお試しください", "error");
    // 断られた場合は本人の意思なので何も言わない
  };

  const saveCsv = async () => {
    const d = snapshot();
    const csv = buildInventoryCsv(d.beetles, d.larvae, lines);
    const result = await saveTextFile(viewerSave, csvFileName(), csv, "text/csv");
    if (result === "saved") showToast("一覧を書き出しました");
    else if (result === "failed") showToast("書き出せませんでした", "error");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json.text);
      showToast("コピーしました。メモ帳などに貼って保存してください");
    } catch {
      showToast("コピーできませんでした", "error");
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じファイルを選び直せるようにする
    if (!file) return;
    try {
      const parsed = parseBackup(await file.text());
      setPending({ ...parsed, fileName: file.name });
      setConfirmReplace(false);
    } catch (err) {
      showToast(
        err instanceof BackupParseError ? err.message : "ファイルを読めませんでした",
        "error"
      );
    }
  };

  const doMerge = () => {
    if (!pending) return;
    const r = mergeAll(pending.data);
    showToast(
      r.duplicated > 0
        ? `${r.added}件を追加しました (${r.duplicated}件はすでにあるので飛ばしました)`
        : `${r.added}件を追加しました`
    );
    setPending(null);
    onClose();
  };

  const doReplace = () => {
    if (!pending) return;
    const r = replaceAll(pending.data);
    showToast(`${r.added}件に入れ替えました`);
    setPending(null);
    onClose();
  };

  const p = pending;
  const pCounts = p && {
    beetles: p.data.beetles.length,
    lines: p.data.lines.length,
    larvae: p.data.larvae.length,
    expenses: p.data.expenses.length,
  };

  return (
    <Sheet title="データの持ち出し" onClose={onClose}>
      {/* ── 書き出す ── */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--kuwa-card)", border: "1px solid var(--kuwa-line)" }}
      >
        <p
          className="font-maru text-sm font-bold flex items-center gap-2"
          style={{ color: "var(--kuwa-ink)" }}
        >
          <Save className="w-4 h-4" strokeWidth={2.2} style={{ color: "var(--kuwa-amber)" }} />
          バックアップを作る
        </p>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
          <Row label="成虫" value={json.counts.beetles} />
          <Row label="幼虫・蛹" value={json.counts.larvae} />
          <Row label="ライン" value={json.counts.lines} />
          <Row label="経費" value={json.counts.expenses} />
        </div>

        <button
          onClick={() => setWithPhotos((v) => !v)}
          className="w-full mt-3 rounded-xl px-3 py-2.5 flex items-center gap-2.5 active:scale-[0.98] transition-all"
          style={
            withPhotos
              ? { background: "var(--kuwa-amber-soft)", border: "1px solid rgba(163,102,15,0.3)" }
              : { background: "var(--kuwa-bark-bg)", border: "1px solid var(--kuwa-line)" }
          }
        >
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={
              withPhotos
                ? { background: "var(--kuwa-amber)", color: "#fdf6e7" }
                : { background: "var(--kuwa-card)", color: "var(--kuwa-ink-soft)" }
            }
          >
            {withPhotos ? (
              <Check className="w-4 h-4" strokeWidth={2.6} />
            ) : (
              <ImageIcon className="w-4 h-4" strokeWidth={2.2} />
            )}
          </span>
          <span className="text-left flex-1 min-w-0">
            <span
              className="block text-xs font-medium"
              style={{ color: "var(--kuwa-ink)" }}
            >
              写真を含める
            </span>
            <span className="block text-[11px] mt-0.5" style={{ color: "var(--kuwa-ink-soft)" }}>
              外すとファイルがぐっと軽くなります
            </span>
          </span>
          <span
            className="text-xs font-bold flex-shrink-0"
            style={{ color: "var(--kuwa-bark)", fontVariantNumeric: "tabular-nums" }}
          >
            {formatBytes(json.size)}
          </span>
        </button>

        <p className="text-[11px] mt-3 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
          くわらぼに戻すための控えです。中身を読むためのものではありません。
        </p>

        <div className="flex gap-2 mt-2.5">
          <button
            onClick={save}
            disabled={total === 0}
            className="kuwa-btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-40"
          >
            <Download className="w-4 h-4" strokeWidth={2.4} />
            ファイルに保存
          </button>
          <button
            onClick={copy}
            disabled={total === 0}
            className="kuwa-btn-ghost px-4 py-3 text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-40"
            aria-label="バックアップをコピー"
          >
            <ClipboardCopy className="w-4 h-4" strokeWidth={2.4} />
            コピー
          </button>
        </div>
      </div>

      {/* ── 表計算ソフト向け ── */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--kuwa-card)", border: "1px solid var(--kuwa-line)" }}
      >
        <p
          className="font-maru text-sm font-bold flex items-center gap-2"
          style={{ color: "var(--kuwa-ink)" }}
        >
          <FileSpreadsheet
            className="w-4 h-4"
            strokeWidth={2.2}
            style={{ color: "var(--kuwa-moss)" }}
          />
          一覧を表にして書き出す
        </p>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
          Numbers や Excel で開ける形 (CSV) です。手持ちを一覧で眺めたり、
          お店に見せたりするときに。
        </p>
        <button
          onClick={saveCsv}
          disabled={total === 0}
          className="kuwa-btn-ghost w-full mt-3 py-3 text-sm active:scale-[0.98] transition-all disabled:opacity-40"
        >
          CSVで書き出す
        </button>
        <p className="text-[11px] mt-2 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
          こちらは読みこみ直せません。機種変更や引っ越しには上のバックアップを使ってください。
        </p>
      </div>

      {/* ── 読みこむ ── */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--kuwa-card)", border: "1px solid var(--kuwa-line)" }}
      >
        <p
          className="font-maru text-sm font-bold flex items-center gap-2"
          style={{ color: "var(--kuwa-ink)" }}
        >
          <FolderOpen className="w-4 h-4" strokeWidth={2.2} style={{ color: "var(--kuwa-moss)" }} />
          書き出したファイルを読みこむ
        </p>

        {!p ? (
          <>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
              機種を変えたときや、別の端末でも同じ記録を見たいときに使います。
            </p>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              onChange={onFile}
              className="hidden"
            />
            <button
              onClick={() => fileInput.current?.click()}
              className="kuwa-btn-ghost w-full mt-3 py-3 text-sm active:scale-[0.98] transition-all"
            >
              ファイルを選ぶ
            </button>
          </>
        ) : (
          <>
            <p className="text-xs mt-2 truncate" style={{ color: "var(--kuwa-ink-soft)" }}>
              {p.fileName}
              {p.exportedAt && ` · ${p.exportedAt.slice(0, 10)} の記録`}
            </p>

            <div
              className="mt-3 rounded-xl p-3 grid grid-cols-2 gap-x-4 gap-y-1.5"
              style={{ background: "var(--kuwa-bark-bg)" }}
            >
              <Row label="成虫" value={pCounts!.beetles} />
              <Row label="幼虫・蛹" value={pCounts!.larvae} />
              <Row label="ライン" value={pCounts!.lines} />
              <Row label="経費" value={pCounts!.expenses} />
            </div>

            {p.skipped > 0 && (
              <p className="text-[11px] mt-2" style={{ color: "var(--kuwa-clay)" }}>
                {p.skipped}件は形が壊れていたので読みとばしました
              </p>
            )}

            {!confirmReplace ? (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={doMerge}
                  className="kuwa-btn-primary flex-1 py-3 text-sm active:scale-[0.98] transition-all"
                >
                  いまの記録に追加
                </button>
                <button
                  onClick={() => setConfirmReplace(true)}
                  className="kuwa-btn-ghost px-4 py-3 text-sm active:scale-[0.98] transition-all"
                >
                  入れ替え
                </button>
              </div>
            ) : (
              <div
                className="mt-3 rounded-xl p-3"
                style={{ background: "var(--kuwa-clay-bg)", border: "1px solid rgba(163,80,47,0.3)" }}
              >
                <p
                  className="font-maru text-xs font-bold flex items-center gap-1.5"
                  style={{ color: "var(--kuwa-clay)" }}
                >
                  <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.4} />
                  いまの記録は消えます
                </p>
                <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
                  この端末の{total}件を捨てて、ファイルの中身だけにします。元に戻せません。
                </p>
                <div className="flex gap-2 mt-2.5">
                  <button
                    onClick={doReplace}
                    className="kuwa-btn-danger flex-1 py-2.5 text-sm active:scale-[0.98] transition-all"
                  >
                    入れ替える
                  </button>
                  <button
                    onClick={() => setConfirmReplace(false)}
                    className="kuwa-btn-ghost px-4 py-2.5 text-sm active:scale-[0.98] transition-all"
                  >
                    やめる
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setPending(null);
                setConfirmReplace(false);
              }}
              className="w-full mt-2 py-2 text-xs"
              style={{ color: "var(--kuwa-ink-soft)" }}
            >
              別のファイルを選ぶ
            </button>
          </>
        )}
      </div>

      <p className="text-[11px] leading-relaxed px-1" style={{ color: "var(--kuwa-ink-soft)" }}>
        記録はこの端末の中だけに保存されています。ブラウザの履歴やサイトデータを消すと
        いっしょに消えるので、ときどき書き出しておくと安心です。
      </p>
    </Sheet>
  );
}
