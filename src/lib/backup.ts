import {
  Beetle,
  BreedingLine,
  Expense,
  Larva,
  ReminderSettings,
  ScheduleSettings,
} from "@/types";
import type { SpeciesOverrides } from "@/lib/speciesTuning";

/** バックアップの中身 (ストアの永続化対象と同じ) */
export interface BackupData {
  beetles: Beetle[];
  lines: BreedingLine[];
  larvae: Larva[];
  expenses: Expense[];
  reminder?: ReminderSettings;
  /** 育成の目安にする日数 (全体) */
  schedule?: ScheduleSettings;
  /** 品種ごとに直した値 */
  speciesTuning?: SpeciesOverrides;
}

/** 書き出すJSONファイルの形 */
export interface BackupFile {
  app: "kuwarabo";
  version: number;
  exportedAt: string;
  /** 記録の件数。設定は数えない */
  counts: Record<"beetles" | "lines" | "larvae" | "expenses", number>;
  data: BackupData;
}

export const BACKUP_VERSION = 1;
const APP_TAG = "kuwarabo";

/* ───────────────────────── 書き出し ───────────────────────── */

/** 写真を落とした複製を作る (ファイルを軽くしたいとき用) */
function dropPhoto<T extends Beetle | Larva>(x: T): T {
  const copy = { ...x };
  delete copy.photoUrl;
  delete (copy as Beetle).photoUrls;
  // 参照だけ残しても、持ち出した先には写真が無い
  delete copy.photoId;
  delete (copy as Beetle).photoIds;
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

/** 文字なら文字、そうでなければ空。undefined を渡さないための受け皿 */
function asText(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** 配列なら配列、そうでなければ空 */
function asList(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/**
 * 文字だけの配列にする。空になったら undefined。
 *
 * 写真の欄は配列を当てにして読むので、数や null が混ざったファイルを
 * そのまま通すと画面が真っ白になる (以前ビン交換の履歴で起きた)。
 */
function asStrings(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === "string" && x !== "");
  return out.length > 0 ? out : undefined;
}

/** 生き死には、はっきり false と書いてあるときだけ死んだ扱いにする */
function asAlive(v: unknown): boolean {
  return v !== false;
}

/**
 * id があり形の分かるものだけ通す。壊れた1件で全体を諦めないため。
 *
 * 通すときに、画面が当てにしている必須項目をそろえる。欠けたまま通すと
 * 一覧の並べ替えや検索でその項目を手繰って落ちるが、1項目足りないだけで
 * 記録ごと捨てるのは惜しい (入れたあとに本人が直せる)。
 * 性別や齢のような「選ぶもの」は埋めない — 勝手に決めると、
 * 書いていないことを書いてあるように見せてしまう。空欄なら空欄のまま出す
 */
function pickValid<T>(
  raw: unknown,
  build: (o: Record<string, unknown>) => T | null
): { ok: T[]; skipped: number } {
  if (!Array.isArray(raw)) return { ok: [], skipped: 0 };
  const ok: T[] = [];
  let skipped = 0;
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isRecord(item) || typeof item.id !== "string" || !item.id) {
      skipped++;
      continue;
    }
    if (seen.has(item.id)) {
      skipped++; // ファイル内で id が重複していたら後勝ちにせず捨てる
      continue;
    }
    const rec = build(item);
    if (!rec) {
      skipped++;
      continue;
    }
    seen.add(item.id);
    ok.push(rec);
  }
  return { ok, skipped };
}

const SCHEDULE_KEYS = ["pupaDaysMin", "pupaDaysMax", "digOutDays", "bottleChangeDays"] as const;
const TUNING_KEYS = ["feedIntervalDays", ...SCHEDULE_KEYS] as const;

/** 日数として使える数だけ通す */
function asDays(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;
}

/** 4つそろっていなければ使わない (欠けた目安で日付を出すと当てにならない) */
function pickSchedule(v: unknown): ScheduleSettings | undefined {
  if (!isRecord(v)) return undefined;
  const out: Record<string, number> = {};
  for (const k of SCHEDULE_KEYS) {
    const n = asDays(v[k]);
    if (n == null) return undefined;
    out[k] = n;
  }
  return out as unknown as ScheduleSettings;
}

/** 品種ごとの値。読める項目だけ拾い、空になった品種は落とす */
function pickSpeciesTuning(v: unknown): SpeciesOverrides | undefined {
  if (!isRecord(v)) return undefined;
  const out: SpeciesOverrides = {};
  for (const [species, patch] of Object.entries(v)) {
    if (!species || !isRecord(patch)) continue;
    const kept: Record<string, number> = {};
    for (const k of TUNING_KEYS) {
      const n = asDays(patch[k]);
      if (n != null) kept[k] = n;
    }
    if (Object.keys(kept).length > 0) out[species] = kept;
  }
  return Object.keys(out).length > 0 ? out : undefined;
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

  const beetles = pickValid<Beetle>(d.beetles, (o) =>
    typeof o.species !== "string"
      ? null
      : ({
          ...o,
          code: asText(o.code),
          acquiredDate: asText(o.acquiredDate),
          notes: asText(o.notes),
          isAlive: asAlive(o.isAlive),
          // 写真の欄は配列として読むので、形が違えば落とす
          photoIds: asStrings(o.photoIds),
          photoUrls: asStrings(o.photoUrls),
        } as unknown as Beetle)
  );

  const lines = pickValid<BreedingLine>(d.lines, (o) =>
    typeof o.name !== "string"
      ? null
      : ({ ...o, notes: asText(o.notes) } as unknown as BreedingLine)
  );

  const larvae = pickValid<Larva>(d.larvae, (o) =>
    typeof o.species !== "string"
      ? null
      : ({
          ...o,
          code: asText(o.code),
          notes: asText(o.notes),
          isAlive: asAlive(o.isAlive),
          // ビン交換の履歴は日付で並べ替えるので、日付の無い行は通さない
          bottleChanges: asList(o.bottleChanges).filter(
            (c) => isRecord(c) && typeof c.date === "string"
          ),
        } as unknown as Larva)
  );

  const expenses = pickValid<Expense>(d.expenses, (o) =>
    typeof o.amountYen !== "number"
      ? null
      : ({ ...o, date: asText(o.date) } as unknown as Expense)
  );

  const total =
    beetles.ok.length + lines.ok.length + larvae.ok.length + expenses.ok.length;
  if (total === 0) {
    throw new BackupParseError("取り込める記録が1件もありませんでした");
  }

  const schedule = pickSchedule(d.schedule);
  const speciesTuning = pickSpeciesTuning(d.speciesTuning);

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
      schedule,
      speciesTuning,
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
