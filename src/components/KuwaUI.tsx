"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, LucideIcon, Plus, Trash2, X } from "lucide-react";
import { fileToPhoto } from "@/lib/photo";
import { PhotoSize, photoSrc, savePhoto } from "@/lib/photoStore";
import { PHOTO_MAX, PhotoHolder, photoEntries, photoIdsOf } from "@/lib/photoRef";

/** 記録が持つ写真の参照 */
export interface PhotoRef {
  photoId?: string;
  /** 旧形式。移行が済むまでの間だけ入っている */
  photoUrl?: string;
}

/**
 * 写真の参照を `<img src>` に渡せる形に解く。
 * 旧形式はそれ自体が中身なのでそのまま返し、photoId は置き場に取りにいく。
 */
function usePhoto(ref?: PhotoRef, size: PhotoSize = "thumb"): string | undefined {
  const { photoId, photoUrl } = ref ?? {};
  // 取りにいった結果。どの写真のものかを一緒に持っておき、別の写真へ
  // 切り替わった直後に前の写真を出してしまわないようにする
  const [fetched, setFetched] = useState<{ id: string; src?: string } | null>(null);

  useEffect(() => {
    // 旧形式は中身そのものなので取りにいく必要がない
    if (photoUrl || !photoId) return;
    let alive = true;
    photoSrc(photoId, size)
      .then((src) => {
        if (alive) setFetched({ id: photoId, src });
      })
      .catch(() => {
        if (alive) setFetched({ id: photoId });
      });
    return () => {
      alive = false;
    };
  }, [photoId, photoUrl, size]);

  if (photoUrl) return photoUrl;
  if (!photoId) return undefined;
  return fetched?.id === photoId ? fetched.src : undefined;
}

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
  action,
}: {
  icon: LucideIcon;
  color: string;
  /** 挿絵。無い場合はアイコンで代用する */
  image?: string;
  title: string;
  hint?: string;
  /** 「絞り込みを外す」のように、その場で状況を抜け出せる操作 */
  action?: { label: string; onClick: () => void };
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
      {action && (
        <button
          onClick={action.onClick}
          className="kuwa-btn-ghost mt-4 px-5 py-2.5 text-sm active:scale-[0.98] transition-all"
        >
          {action.label}
        </button>
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

        <div className="kuwa-sheet-body flex-1 px-5 py-5 space-y-5">{children}</div>

        {footer && <div className="kuwa-sheet-foot flex-shrink-0 px-5 pt-4 pb-safe-lg">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * 写真が1枚のピッカー (幼虫用)。
 *
 * 幼虫は見た目で個体差が分かりにくく、何枚も残す意味が薄いので1枚のまま。
 * 成虫は `PhotoPickerMulti`。
 *
 * 選んだ写真はその場で置き場に入れ、呼ぶ側へは id だけ渡す。
 * 入れたあとに登録をやめた写真は迷子になるが、起動時の掃除で片付く
 */
export function PhotoPicker({
  value,
  onChange,
  label = "写真",
}: {
  value?: PhotoRef;
  onChange: (photoId: string | undefined) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const src = usePhoto(value);
  const [brokenSrc, setBrokenSrc] = useState<string>();
  const shown = src && src !== brokenSrc ? src : undefined;
  // 写真の有無は参照の有無で決める。src は取りにいっている間だけ空になるので、
  // これで判断すると選んだ直後に「えらぶ」へ戻って見える
  const has = Boolean(value?.photoId || value?.photoUrl);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await savePhoto(await fileToPhoto(file)));
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
            background: has ? "transparent" : "var(--kuwa-bark-bg)",
            border: has ? "1px solid var(--kuwa-line)" : "1px dashed rgba(107,68,35,0.4)",
          }}
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shown}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setBrokenSrc(shown)}
            />
          ) : has ? null : (
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
            {has
              ? "タップすると撮り直せます"
              : "1枚だけ登録できます。あとから大きく見られます"}
          </p>
          {has && (
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

/**
 * 何枚も持てる写真のピッカー (成虫用)。
 *
 * 羽化直後・今・大あごの寄りなど、残しておきたい姿は1枚では足りない。
 * 先頭が主な1枚で、一覧や個体カードはそれを使うので、並びが分かるようにしてある。
 *
 * 移行前の写真 (記録が中身を抱えたまま) は置き場にまだ無く、id で指せないので
 * 外せない。起動時の移行で片付いたら外せるようになる。
 */
export function PhotoPickerMulti({
  value,
  onChange,
  label = "写真",
  max = PHOTO_MAX,
}: {
  value: PhotoHolder;
  onChange: (photoIds: string[]) => void;
  label?: string;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = photoIdsOf(value);
  const entries = photoEntries(value);
  const full = entries.length >= max;

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    const added: string[] = [];
    let failed = 0;
    // 入る枚数だけ受ける。足すたびに1枚ずつ選ばせるより、まとめて選べるほうが早い
    for (const file of files.slice(0, max - entries.length)) {
      try {
        added.push(await savePhoto(await fileToPhoto(file)));
      } catch {
        failed++;
      }
    }
    if (added.length > 0) onChange([...ids, ...added]);
    if (failed > 0) setError("読み込めなかった写真があります。別の写真でお試しください");
    setBusy(false);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: "var(--kuwa-ink)" }}>
        {label}
      </label>

      <div className="flex gap-2.5 flex-wrap">
        {entries.map((entry, i) => (
          <PhotoTile
            key={entry.photoId ?? `legacy-${i}`}
            photo={entry}
            main={i === 0}
            onRemove={
              entry.photoId
                ? () => onChange(ids.filter((id) => id !== entry.photoId))
                : undefined
            }
          />
        ))}

        {!full && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 transition-all active:scale-[0.96]"
            style={{
              background: "var(--kuwa-bark-bg)",
              border: "1px dashed rgba(107,68,35,0.4)",
            }}
          >
            <Camera className="w-6 h-6" strokeWidth={2} style={{ color: "var(--kuwa-bark)" }} />
            <span className="text-[10px] font-bold mt-1" style={{ color: "var(--kuwa-bark)" }}>
              {busy ? "処理中…" : entries.length === 0 ? "えらぶ" : "足す"}
            </span>
          </button>
        )}
      </div>

      <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
        {entries.length === 0
          ? `${max}枚まで登録できます。羽化直後と今など、残したい姿を分けて入れられます`
          : full
          ? `${max}枚まで登録できます。入れ替えるには、どれかを外してください`
          : `左の1枚が一覧や個体カードに出ます (あと${max - entries.length}枚)`}
      </p>
      {error && (
        <p className="text-xs mt-1.5" style={{ color: "var(--kuwa-clay)" }}>
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={pick}
      />
    </div>
  );
}

/** ピッカーの中の1枚。主な1枚には印を付ける */
function PhotoTile({
  photo,
  main,
  onRemove,
}: {
  photo: PhotoRef;
  main: boolean;
  onRemove?: () => void;
}) {
  const src = usePhoto(photo);
  const [brokenSrc, setBrokenSrc] = useState<string>();
  const shown = src && src !== brokenSrc ? src : undefined;

  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <div
        className="w-20 h-20 rounded-2xl overflow-hidden"
        style={{ background: "var(--kuwa-bark-bg)", border: "1px solid var(--kuwa-line)" }}
      >
        {shown && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setBrokenSrc(shown)}
          />
        )}
      </div>

      {main && (
        <span
          className="absolute left-1 bottom-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md"
          style={{ background: "rgba(36,26,17,0.72)", color: "#fdf6e7" }}
        >
          主な1枚
        </span>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="この写真を外す"
          className="absolute -right-1.5 -top-1.5 w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-all"
          style={{ background: "var(--kuwa-clay)", color: "#fdf6e7" }}
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.6} />
        </button>
      )}
    </div>
  );
}

/**
 * 写真を大きく見る。
 *
 * どこを押しても閉じる — 見終わったらすぐ戻りたいので、閉じる的を探させない。
 * 何枚か持っているときは左右で送れるようにし、送る的だけは閉じないようにする。
 *
 * ここは詳細シートの**背景の上**に出るので、押した合図をそのまま上に通すと
 * 背景の「押したら閉じる」にも届いて、写真を閉じたついでに詳細シートまで
 * 閉じてしまう。写真を見ていた場所に戻れないので、根元で止める。
 */
export function PhotoViewer({
  photos,
  start = 0,
  onClose,
}: {
  photos: PhotoRef[];
  start?: number;
  onClose: () => void;
}) {
  const [at, setAt] = useState(start);
  // 写真を外したあとに開き直したときなど、番号が枚数を越えることがある
  const index = Math.min(at, Math.max(0, photos.length - 1));
  const src = usePhoto(photos[index], "full");
  const many = photos.length > 1;

  const step = (e: React.MouseEvent, by: number) => {
    // 送る的の上で閉じてしまわないように
    e.stopPropagation();
    setAt((n) => (n + by + photos.length) % photos.length);
  };

  return (
    <div
      // シート (z-50) より上に出す
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(20,14,8,0.94)" }}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <button
        onClick={onClose}
        aria-label="閉じる"
        className="absolute right-4 p-2.5 rounded-full active:scale-90 transition-all"
        style={{
          top: "calc(16px + env(safe-area-inset-top, 0px))",
          background: "rgba(253,246,231,0.15)",
          color: "#fdf6e7",
        }}
      >
        <X className="w-5 h-5" strokeWidth={2.4} />
      </button>

      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
      ) : (
        <p className="text-sm" style={{ color: "rgba(253,246,231,0.7)" }}>
          読み込んでいます…
        </p>
      )}

      {many && (
        <>
          <button
            onClick={(e) => step(e, -1)}
            aria-label="前の写真"
            className="absolute left-3 p-3 rounded-full active:scale-90 transition-all"
            style={{ background: "rgba(253,246,231,0.15)", color: "#fdf6e7" }}
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.4} />
          </button>
          <button
            onClick={(e) => step(e, 1)}
            aria-label="次の写真"
            className="absolute right-3 p-3 rounded-full active:scale-90 transition-all"
            style={{ background: "rgba(253,246,231,0.15)", color: "#fdf6e7" }}
          >
            <ChevronRight className="w-6 h-6" strokeWidth={2.4} />
          </button>
          <p
            className="absolute text-xs font-bold"
            style={{
              bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
              color: "rgba(253,246,231,0.8)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {index + 1} / {photos.length}
          </p>
        </>
      )}
    </div>
  );
}

/**
 * 一覧のサムネイル。写真がなければ fallback (種類アバター等) を出す。
 * onClick を渡すと押せるようになる (写真があるときだけ的になる)
 */
export function PhotoThumb({
  photo,
  fallback,
  size = "md",
  onClick,
}: {
  photo?: PhotoRef;
  fallback: React.ReactNode;
  size?: "sm" | "md";
  onClick?: () => void;
}) {
  const src = usePhoto(photo);
  // 参照は残っているのに写真が読めないことがある (記録だけ戻したバックアップなど)。
  // 壊れた画像のアイコンを出すより、写真が無いときと同じ顔にする
  const [brokenSrc, setBrokenSrc] = useState<string>();

  if (!src || src === brokenSrc) return <>{fallback}</>;
  const cls = size === "sm" ? "w-10 h-10 rounded-xl" : "w-11 h-11 rounded-xl";
  const Box = onClick ? "button" : "div";
  return (
    <Box
      {...(onClick
        ? { type: "button" as const, onClick, "aria-label": "写真を大きく見る" }
        : {})}
      className={`${cls} overflow-hidden flex-shrink-0 ${
        onClick ? "active:scale-90 transition-all" : ""
      }`}
      style={{ border: "1px solid var(--kuwa-line)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover"
        onError={() => setBrokenSrc(src)}
      />
    </Box>
  );
}

/**
 * 金額の入力欄。
 * 桁が多いと読み違えるので、3桁ごとに区切って ¥ を頭に出す。
 * 中身は数字だけの文字列で持ち、表示のときだけ整形する。
 */
export function MoneyInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  /** 数字だけの文字列。空文字は未入力 */
  value: string;
  onChange: (digits: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const shown = value === "" ? "" : Number(value).toLocaleString("ja-JP");
  return (
    <div className={`relative ${className ?? ""}`}>
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none"
        style={{ color: "var(--kuwa-ink-soft)" }}
      >
        ¥
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={shown}
        // 区切りの「,」を打たれても、貼り付けられても、数字だけ残す
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
        placeholder={placeholder}
        className="kuwa-input"
        style={{ paddingLeft: 30 }}
      />
    </div>
  );
}
