"use client";

import { useRef, useState } from "react";
import { Camera, LucideIcon, Plus, Trash2 } from "lucide-react";
import { fileToThumbnailDataUrl } from "@/lib/photo";

/** セクション見出し (塗りアイコンタイル + 丸ゴシック) */
export function SectionTitle({
  icon: Icon,
  color,
  children,
}: {
  icon: LucideIcon;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: color, color: "#fffdf6" }}
      >
        <Icon className="w-[15px] h-[15px]" strokeWidth={2.4} />
      </span>
      <h2 className="font-maru text-[15px] font-bold" style={{ color: "var(--kuwa-ink)" }}>
        {children}
      </h2>
    </div>
  );
}

/** 空状態: 挿絵と、次の行動を促す一言を添える */
export function EmptyState({
  icon: Icon,
  color,
  image,
  title,
  hint,
}: {
  icon: LucideIcon;
  color: string;
  /** 挿絵。無い場合はアイコンで代用する */
  image?: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="kuwa-card px-6 py-9 text-center">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" width={112} height={112} className="mx-auto mb-4 block" />
      ) : (
        <span
          className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: color, opacity: 0.16 }}
        >
          <Icon className="w-7 h-7" strokeWidth={1.8} style={{ color, opacity: 1 }} />
        </span>
      )}
      <p
        className="font-maru text-sm font-bold"
        style={{ color: "var(--kuwa-ink)", textWrap: "pretty" }}
      >
        {title}
      </p>
      {hint && (
        <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)", textWrap: "pretty" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/** 右下の追加ボタン */
export function Fab({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="kuwa-fab fixed right-5 w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 z-40"
      style={{ bottom: "calc(max(8px, env(safe-area-inset-bottom)) + 76px)" }}
    >
      <Plus className="w-6 h-6" strokeWidth={2.4} />
    </button>
  );
}

/** ボトムシートの外枠 (ヘッダー + スクロール本体 + 固定フッター) */
export function Sheet({
  title,
  badge,
  onClose,
  children,
  footer,
  actions,
}: {
  title: React.ReactNode;
  badge?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(36,26,17,0.55)" }}>
      <div
        className="kuwa-sheet w-full max-w-md mx-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kuwa-sheet-bar sticky top-0 px-5 py-4 flex items-center justify-between gap-2 flex-shrink-0 rounded-t-[24px]">
          <div className="flex items-center gap-2.5 min-w-0">
            <h2
              className="font-maru text-lg font-bold truncate"
              style={{ color: "var(--kuwa-ink)" }}
            >
              {title}
            </h2>
            {badge}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {actions}
            <button
              onClick={onClose}
              aria-label="閉じる"
              className="p-2 rounded-full"
              style={{ color: "var(--kuwa-ink-soft)" }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">{children}</div>

        {footer && <div className="kuwa-sheet-foot flex-shrink-0 px-5 pt-4 pb-safe-lg">{footer}</div>}
      </div>
    </div>
  );
}

/** 個体写真のピッカー (長辺320pxへ縮小して data URI で受け渡す) */
export function PhotoPicker({
  value,
  onChange,
  label = "写真",
}: {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await fileToThumbnailDataUrl(file));
    } catch {
      setError("この画像は読み込めませんでした。別の写真でお試しください");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: "var(--kuwa-ink)" }}>
        {label}
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 overflow-hidden transition-all active:scale-[0.96]"
          style={{
            background: value ? "transparent" : "var(--kuwa-bark-bg)",
            border: value ? "1px solid var(--kuwa-line)" : "1px dashed rgba(107,68,35,0.4)",
          }}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <>
              <Camera className="w-6 h-6" strokeWidth={2} style={{ color: "var(--kuwa-bark)" }} />
              <span className="text-[10px] font-bold mt-1" style={{ color: "var(--kuwa-bark)" }}>
                {busy ? "処理中…" : "えらぶ"}
              </span>
            </>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-xs leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
            {value
              ? "タップすると撮り直せます"
              : "1枚だけ登録できます。長辺320pxに縮小して保存します"}
          </p>
          {value && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="mt-2 text-xs font-bold flex items-center gap-1"
              style={{ color: "var(--kuwa-clay)" }}
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
              写真を外す
            </button>
          )}
          {error && (
            <p className="text-xs mt-1.5" style={{ color: "var(--kuwa-clay)" }}>
              {error}
            </p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={pick}
      />
    </div>
  );
}

/** 一覧のサムネイル。写真がなければ fallback (種類アバター等) を出す */
export function PhotoThumb({
  src,
  fallback,
  size = "md",
}: {
  src?: string;
  fallback: React.ReactNode;
  size?: "sm" | "md";
}) {
  if (!src) return <>{fallback}</>;
  const cls = size === "sm" ? "w-10 h-10 rounded-xl" : "w-11 h-11 rounded-xl";
  return (
    <div
      className={`${cls} overflow-hidden flex-shrink-0`}
      style={{ border: "1px solid var(--kuwa-line)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="w-full h-full object-cover" />
    </div>
  );
}
