import { Beetle, BreedingLine, Expense, ExpenseCategory, Larva, LarvaStage, LineStatus } from "@/types";

/** 端末のローカル日付を YYYY-MM-DD で返す (日付が変われば別の値になる) */
export function todayStr(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 今日エサをあげる必要があるか。後食前・販売済み・飼育終了は対象外 */
export function needsFeedingToday(b: Beetle, today = todayStr()): boolean {
  if (!b.isAlive || b.soldPriceYen != null) return false;
  if (!b.matured) return false;
  return b.lastFedDate !== today;
}

/** 今日の給餌対象と、そのうち未完了の数 */
export function feedingSummary(beetles: Beetle[], today = todayStr()) {
  const targets = beetles.filter(
    (b) => b.isAlive && b.soldPriceYen == null && b.matured
  );
  const pending = targets.filter((b) => b.lastFedDate !== today);
  return { targets, pending, done: targets.length - pending.length };
}

/**
 * 種類の選択肢。国産・外国産で分け、外国産は属ごとにまとめている
 * (オオクワ系 → ヒラタ系 → ノコギリ系 → フタマタ系 → ホソアカ系 →
 *  キンイロ系 → ツヤ系 → オウゴンオニ)。
 * 飼育者は近縁種をまとめて見るので、五十音順よりこの並びのほうが探しやすい。
 */
export const SPECIES_GROUPS: { label: string; species: string[] }[] = [
  {
    label: "国産",
    species: [
      "オオクワガタ",
      "ヒラタクワガタ",
      "コクワガタ",
      "ノコギリクワガタ",
      "ミヤマクワガタ",
      "アカアシクワガタ",
      "ネブトクワガタ",
      "ヒメオオクワガタ",
    ],
  },
  {
    label: "外国産",
    species: [
      "ホペイオオクワガタ",
      "タイワンオオクワガタ",
      "アンタエウスオオクワガタ",
      "パラワンオオヒラタ",
      "スマトラオオヒラタ",
      "アルキデスヒラタクワガタ",
      "ダイオウヒラタクワガタ",
      "ギラファノコギリクワガタ",
      "セアカフタマタクワガタ",
      "マンディブラリスフタマタクワガタ",
      "メタリフェルホソアカクワガタ",
      "ニジイロクワガタ",
      "パプアキンイロクワガタ",
      "タランドゥスオオツヤクワガタ",
      "レギウスオオツヤクワガタ",
      "インターメディアツヤクワガタ",
      "オウゴンオニクワガタ",
    ],
  },
];

export const SPECIES_OPTIONS = [
  ...SPECIES_GROUPS.flatMap((g) => g.species),
  "その他",
];

export const LINE_STATUS_LABELS: Record<LineStatus, string> = {
  pairing: "ペアリング中",
  laying: "産卵セット中",
  waiting_split: "割り出し待ち",
  split_done: "割り出し済み",
  finished: "終了",
};

export const LINE_STATUS_COLORS: Record<LineStatus, string> = {
  pairing:       "bg-[#eccfc2] text-[#94472a]",
  laying:        "bg-[#f0d49b] text-[#a3660f]",
  waiting_split: "bg-[#eec98f] text-[#8a5410]",
  split_done:    "bg-[#d7e0b8] text-[#55682f]",
  finished:      "bg-[#ded5c6] text-[#7a7062]",
};

export const LINE_STATUS_ORDER: LineStatus[] = [
  "pairing",
  "laying",
  "waiting_split",
  "split_done",
  "finished",
];

export const STAGE_LABELS: Record<LarvaStage, string> = {
  egg: "卵",
  L1: "初齢",
  L2: "2齢",
  L3: "3齢",
  prepupa: "前蛹",
  pupa: "蛹",
  adult: "羽化",
};

export const STAGE_COLORS: Record<LarvaStage, string> = {
  egg:   "bg-[#e4dbc9] text-[#6f6250]",
  L1:    "bg-[#e6ecca] text-[#66783c]",
  L2:    "bg-[#dbe5b9] text-[#5b6c33]",
  L3:    "bg-[#d1dcaa] text-[#4f5f2a]",
  prepupa: "bg-[#efdcae] text-[#8a6a1e]",
  pupa:  "bg-[#f0d49b] text-[#8a5410]",
  adult: "bg-[#e6cfa8] text-[#7a4f1e]",
};

/** 雌雄の表示色 (自然色パレット版: 藍とテラコッタ) */
export function genderColor(gender: string): string {
  if (gender === "male") return "text-[#3f5a72]";
  if (gender === "female") return "text-[#a3502f]";
  return "text-[#8b7a64]";
}

export const STAGE_ORDER: LarvaStage[] = ["egg", "L1", "L2", "L3", "prepupa", "pupa", "adult"];

/** 幼虫として餌交換が必要なステージ */
export const FEEDING_STAGES: LarvaStage[] = ["L1", "L2", "L3"];

/** 蛹期 (触らずそっとしておく段階) */
export const PUPA_STAGES: LarvaStage[] = ["prepupa", "pupa"];

export function isFeedingStage(stage: LarvaStage) {
  return FEEDING_STAGES.includes(stage);
}
export function isPupaStage(stage: LarvaStage) {
  return PUPA_STAGES.includes(stage);
}

/** 蛹期間の目安 (日)。実際は種と温度で前後する */
export const PUPA_DAYS_MIN = 21;
export const PUPA_DAYS_MAX = 40;

/** 羽化から掘り出しまでの目安 (日)。体が固まるまで待つ */
export const DIG_OUT_DAYS = 25;

/** 蛹化日から羽化見込み日を返す */
export function expectedEmergeDate(pupaDate: string): string {
  const d = new Date(pupaDate);
  d.setDate(d.getDate() + PUPA_DAYS_MIN);
  return d.toISOString().split("T")[0];
}

/** 羽化日から掘り出し目安日を返す */
export function expectedDigOutDate(emergedDate: string): string {
  const d = new Date(emergedDate);
  d.setDate(d.getDate() + DIG_OUT_DAYS);
  return d.toISOString().split("T")[0];
}

/** ビン交換の目安間隔 (日) */
export const BOTTLE_CHANGE_INTERVAL_DAYS = 90;

export function daysBetween(from: string, to: Date = new Date()): number {
  const ms = to.getTime() - new Date(from).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function latestBottleChange(larva: Larva) {
  if (larva.bottleChanges.length === 0) return undefined;
  return [...larva.bottleChanges].sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function latestWeight(larva: Larva): number | undefined {
  const withWeight = larva.bottleChanges
    .filter((c) => c.weightG != null)
    .sort((a, b) => b.date.localeCompare(a.date));
  return withWeight[0]?.weightG;
}

/** ビン交換からの経過日数 (幼虫・生存中のみ対象) */
export function daysSinceLastChange(larva: Larva): number | undefined {
  const last = latestBottleChange(larva);
  if (!last) return undefined;
  return daysBetween(last.date);
}

// ── 種類別のビジュアルカラー (アバターのグラデーション) ──────
export const SPECIES_GRADIENTS: Record<string, string> = {
  // 国産
  "オオクワガタ": "from-slate-700 to-indigo-950",
  "ヒラタクワガタ": "from-zinc-600 to-zinc-900",
  "コクワガタ": "from-stone-500 to-stone-800",
  "ノコギリクワガタ": "from-orange-700 to-red-950",
  "ミヤマクワガタ": "from-yellow-700 to-amber-950",
  "アカアシクワガタ": "from-red-800 to-stone-950",
  "ネブトクワガタ": "from-stone-600 to-stone-900",
  "ヒメオオクワガタ": "from-slate-600 to-slate-900",
  // オオクワ系
  "ホペイオオクワガタ": "from-slate-800 to-zinc-950",
  "タイワンオオクワガタ": "from-slate-700 to-neutral-950",
  "アンタエウスオオクワガタ": "from-indigo-700 to-indigo-950",
  // ヒラタ系
  "パラワンオオヒラタ": "from-slate-600 to-slate-950",
  "スマトラオオヒラタ": "from-gray-600 to-gray-950",
  "アルキデスヒラタクワガタ": "from-zinc-700 to-black",
  "ダイオウヒラタクワガタ": "from-neutral-700 to-neutral-950",
  // ノコギリ・フタマタ
  "ギラファノコギリクワガタ": "from-amber-700 to-yellow-950",
  "セアカフタマタクワガタ": "from-red-700 to-neutral-900",
  "マンディブラリスフタマタクワガタ": "from-zinc-800 to-black",
  // ホソアカ・キンイロ
  "メタリフェルホソアカクワガタ": "from-teal-600 to-amber-800",
  "ニジイロクワガタ": "from-emerald-500 via-teal-600 to-fuchsia-700",
  "パプアキンイロクワガタ": "from-lime-500 via-emerald-500 to-amber-600",
  // ツヤ・オウゴンオニ
  "タランドゥスオオツヤクワガタ": "from-neutral-600 to-black",
  "レギウスオオツヤクワガタ": "from-neutral-700 to-black",
  "インターメディアツヤクワガタ": "from-amber-900 to-neutral-950",
  "オウゴンオニクワガタ": "from-yellow-400 to-amber-700",
};

export function speciesGradient(species: string): string {
  return SPECIES_GRADIENTS[species] ?? "from-amber-600 to-amber-900";
}

// ── 費用・収支 ──────────────────────────────────────
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "ゼリー",
  "菌糸ビン",
  "マット",
  "産卵材",
  "器具・用品",
  "その他",
];

export function formatYen(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

/** 幼虫1頭あたりのコスト = 入手金額 + ビン・マット代の累計 */
export function larvaCost(larva: Larva): number {
  const bottles = larva.bottleChanges.reduce((sum, c) => sum + (c.costYen ?? 0), 0);
  return (larva.priceYen ?? 0) + bottles;
}

export interface CostSummary {
  beetlePurchase: number;   // 成虫の入手金額合計
  larvaPurchase: number;    // 幼虫の入手金額合計
  bottleCost: number;       // ビン・マット代合計 (幼虫の交換記録)
  expenseByCategory: Partial<Record<ExpenseCategory, number>>;
  expenseTotal: number;     // 消耗品・経費合計
  totalSpent: number;       // 総支出
  salesTotal: number;       // 販売額合計
  balance: number;          // 収支 (売上 - 支出)
}

export function calcCostSummary(
  beetles: Beetle[],
  larvae: Larva[],
  expenses: Expense[]
): CostSummary {
  const beetlePurchase = beetles.reduce((s, b) => s + (b.priceYen ?? 0), 0);
  const larvaPurchase = larvae.reduce((s, l) => s + (l.priceYen ?? 0), 0);
  const bottleCost = larvae.reduce(
    (s, l) => s + l.bottleChanges.reduce((t, c) => t + (c.costYen ?? 0), 0),
    0
  );
  const expenseByCategory: Partial<Record<ExpenseCategory, number>> = {};
  let expenseTotal = 0;
  for (const e of expenses) {
    expenseByCategory[e.category] = (expenseByCategory[e.category] ?? 0) + e.amountYen;
    expenseTotal += e.amountYen;
  }
  const totalSpent = beetlePurchase + larvaPurchase + bottleCost + expenseTotal;
  const salesTotal = beetles.reduce((s, b) => s + (b.soldPriceYen ?? 0), 0);
  return {
    beetlePurchase,
    larvaPurchase,
    bottleCost,
    expenseByCategory,
    expenseTotal,
    totalSpent,
    salesTotal,
    balance: salesTotal - totalSpent,
  };
}

export interface UpcomingTask {
  id: string;
  kind: "bottle" | "split" | "set" | "emerge" | "digout";
  title: string;
  detail: string;
  overdue: boolean;
}

/** ダッシュボード用: 今やるべき作業を導出する */
export function deriveUpcomingTasks(lines: BreedingLine[], larvae: Larva[]): UpcomingTask[] {
  const tasks: UpcomingTask[] = [];

  // ペアリング開始から1週間経過 → 産卵セット投入の目安
  for (const line of lines) {
    if (line.status === "pairing" && line.pairingDate) {
      const days = daysBetween(line.pairingDate);
      if (days >= 7) {
        tasks.push({
          id: `set-${line.id}`,
          kind: "set",
          title: `${line.name} 産卵セット投入`,
          detail: `ペアリング開始から${days}日経過`,
          overdue: days >= 14,
        });
      }
    }
    // セット投入から1ヶ月経過 → 割り出しの目安
    if ((line.status === "laying" || line.status === "waiting_split") && line.setDate) {
      const days = daysBetween(line.setDate);
      if (days >= 30) {
        tasks.push({
          id: `split-${line.id}`,
          kind: "split",
          title: `${line.name} 割り出し`,
          detail: `セット投入から${days}日経過`,
          overdue: days >= 60,
        });
      }
    }
  }

  for (const larva of larvae) {
    if (!larva.isAlive) continue;

    // 最終ビン交換から一定日数経過した幼虫 → ビン交換の目安 (蛹期・羽化後は対象外)
    if (isFeedingStage(larva.stage)) {
      const days = daysSinceLastChange(larva);
      if (days != null && days >= BOTTLE_CHANGE_INTERVAL_DAYS - 10) {
        tasks.push({
          id: `bottle-${larva.id}`,
          kind: "bottle",
          title: `${larva.code} ビン交換`,
          detail: `前回交換から${days}日経過`,
          overdue: days >= BOTTLE_CHANGE_INTERVAL_DAYS,
        });
      }
    }

    // 蛹化から一定日数 → 羽化が近い (触らず見守る合図)
    if (larva.stage === "pupa" && larva.pupaDate) {
      const days = daysBetween(larva.pupaDate);
      if (days >= PUPA_DAYS_MIN - 5) {
        tasks.push({
          id: `emerge-${larva.id}`,
          kind: "emerge",
          title: `${larva.code} そろそろ羽化`,
          detail:
            days > PUPA_DAYS_MAX
              ? `蛹化から${days}日。羽化しているか確認を`
              : `蛹化から${days}日。触らず見守りましょう`,
          overdue: days > PUPA_DAYS_MAX,
        });
      }
    }

    // 羽化から一定日数 → 掘り出しの目安
    if (larva.stage === "adult" && larva.emergedDate && !larva.dugOutDate) {
      const days = daysBetween(larva.emergedDate);
      if (days >= DIG_OUT_DAYS - 5) {
        tasks.push({
          id: `digout-${larva.id}`,
          kind: "digout",
          title: `${larva.code} 掘り出し`,
          detail: `羽化から${days}日経過`,
          overdue: days >= DIG_OUT_DAYS + 14,
        });
      }
    }
  }

  return tasks.sort((a, b) => Number(b.overdue) - Number(a.overdue));
}

/* ───────────── 羽化した幼虫を成虫台帳へ引き上げる ───────────── */

/**
 * 累代表記を1つ進める。
 *   WD (野外採集) → WF1     野外個体の子は WF1
 *   WF1 → WF2 / CBF2 → CBF3 / F5 → F6
 * 表記の揺れは飼育者ごとに幅があるので、読めない形は空で返して手入力にゆだねる。
 */
export function nextGeneration(parent?: string): string {
  const g = parent?.trim().toUpperCase();
  if (!g) return "";
  if (g === "WD" || g === "WILD") return "WF1";
  const m = /^(WF|CBF|CB|F)(\d+)$/.exec(g);
  if (!m) return "";
  const prefix = m[1] === "CB" ? "CBF" : m[1];
  return `${prefix}${parseInt(m[2], 10) + 1}`;
}

/**
 * ラインの親から、子に引き継ぐ産地と累代を割り出す。
 * 産地は母親を優先する (同じ産地同士で組むのが普通だが、
 * 揃っていない場合の慣習として母系をとる)。
 */
export function deriveOffspringInfo(
  line: BreedingLine | undefined,
  beetles: Beetle[]
): { locality: string; generation: string } {
  if (!line) return { locality: "", generation: "" };
  const mother = beetles.find((b) => b.id === line.femaleId);
  const father = beetles.find((b) => b.id === line.maleId);
  return {
    locality: (mother?.locality ?? father?.locality ?? "").trim(),
    generation: nextGeneration(mother?.generation ?? father?.generation),
  };
}
