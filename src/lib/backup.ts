import {
  Beetle,
  BreedingLine,
  Expense,
  Larva,
  ReminderSettings,
} from "@/types";

/** バックアップの中身 (ストアの永続化対象と同じ) */
export interface BackupData {
  beetles: Beetle[];
  lines: BreedingLine[];
  larvae: Larva[];
  expenses: Expense[];
  reminder?: ReminderSettings;
}

/** 書き出すJSONファイルの形 */
export interface BackupFile {
  app: "kuwarabo";
  version: number;
  exportedAt: string;
  counts: Record<keyof Omit<BackupData, "reminder">, number>;
  data: BackupData;
}

export const BACKUP_VERSION = 1;
const APP_TAG = "kuwarabo";

/* ───────────────────────── 書き出し ───────────────────────── */

/** 写真を落とした複製を作る (ファイルを軽くしたいとき用) */
function dropPhoto<T extends { photoUrl?: string }>(x: T): T {
  const copy = { ...x };
  delete copy.photoUrl;
  return copy;
}

function stripPhotos(d: BackupData): BackupData {
  return {
    ...d,
    beetles: d.beetles.map(dropPhoto),
    larvae: d.larvae.map(dropPhoto),
  };
}

export function buildBackup(d: BackupData, includePhotos = true): BackupFile {
  const data = includePhotos ? d : stripPhotos(d);
  return {
    app: APP_TAG,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    counts: {
      beetles: data.beetles.length,
      lines: data.lines.length,
      larvae: data.larvae.length,
      expenses: data.expenses.length,
    },
    data,
  };
}

export function backupFileName(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `kuwarabo-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.json`;
}

/** 人が読めるファイルサイズ */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** UTF-8 でのバイト数 (日本語や写真を含むので文字数では測れない) */
export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

/* ───────────────────────── 読み込み ───────────────────────── */

export interface ParseResult {
  data: BackupData;
  /** 形が壊れていて取り込めなかった件数 */
  skipped: number;
  exportedAt?: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** id があり文字列で識別できるものだけ通す。壊れた1件で全体を諦めないため */
function pickValid<T>(
  raw: unknown,
  extra: (o: Record<string, unknown>) => boolean
): { ok: T[]; skipped: number } {
  if (!Array.isArray(raw)) return { ok: [], skipped: 0 };
  const ok: T[] = [];
  let skipped = 0;
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isRecord(item) || typeof item.id !== "string" || !item.id || !extra(item)) {
      skipped++;
      continue;
    }
    if (seen.has(item.id)) {
      skipped++; // ファイル内で id が重複していたら後勝ちにせず捨てる
      continue;
    }
    seen.add(item.id);
    ok.push(item as T);
  }
  return { ok, skipped };
}

export class BackupParseError extends Error {}

/**
 * ファイルの中身を検証して取り込める形に整える。
 * 別アプリのJSONや壊れたファイルは例外にし、
 * 一部のレコードだけおかしい場合は skipped に数えて残りを活かす。
 */
export function parseBackup(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new BackupParseError("JSONとして読めませんでした");
  }
  if (!isRecord(json)) throw new BackupParseError("中身の形が違います");

  if (json.app !== APP_TAG) {
    throw new BackupParseError("くわらぼのバックアップではないようです");
  }
  if (typeof json.version === "number" && json.version > BACKUP_VERSION) {
    throw new BackupParseError(
      "新しいバージョンで作られたファイルです。アプリを更新してください"
    );
  }
  if (!isRecord(json.data)) throw new BackupParseError("データが入っていません");

  const d = json.data;
  const beetles = pickValid<Beetle>(d.beetles, (o) => typeof o.species === "string");
  const lines = pickValid<BreedingLine>(d.lines, (o) => typeof o.name === "string");
  const larvae = pickValid<Larva>(d.larvae, (o) => typeof o.species === "string");
  const expenses = pickValid<Expense>(
    d.expenses,
    (o) => typeof o.amountYen === "number"
  );

  const total =
    beetles.ok.length + lines.ok.length + larvae.ok.length + expenses.ok.length;
  if (total === 0) {
    throw new BackupParseError("取り込める記録が1件もありませんでした");
  }

  const reminder =
    isRecord(d.reminder) &&
    typeof d.reminder.enabled === "boolean" &&
    typeof d.reminder.time === "string"
      ? (d.reminder as unknown as ReminderSettings)
      : undefined;

  return {
    data: {
      beetles: beetles.ok,
      lines: lines.ok,
      larvae: larvae.ok,
      expenses: expenses.ok,
      reminder,
    },
    skipped: beetles.skipped + lines.skipped + larvae.skipped + expenses.skipped,
    exportedAt: typeof json.exportedAt === "string" ? json.exportedAt : undefined,
  };
}

/** 取り込み結果の内訳 */
export interface ImportResult {
  added: number;
  duplicated: number;
  replaced: number;
}
