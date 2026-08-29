import {
  Beetle,
  BreedingLine,
  Expense,
  ExpenseCategory,
  Gender,
  Larva,
  LarvaStage,
  LineStatus,
  ScheduleSettings,
} from "@/types";

/** 端末のローカル日付を YYYY-MM-DD で返す (日付が変われば別の値になる) */
export function todayStr(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** エサやりの対象になる個体か。後食前・販売済み・飼育終了は対象外 */
function isFeedTarget(b: Beetle): boolean {
  return b.isAlive && b.soldPriceYen == null && !!b.matured;
}

/**
 * エサ替えが必要か。前回から intervalDays 日たっていれば必要とみなす。
 * 記録が一度もなければ必要。intervalDays が 1 のときは
 * 「日付が変われば必要」となり、間隔を設けていなかった頃と同じ挙動になる。
 */
export function needsFeeding(b: Beetle, intervalDays = 1, today = todayStr()): boolean {
  if (!isFeedTarget(b)) return false;
  if (!b.lastFedDate) return true;
  return daysBetween(b.lastFedDate, new Date(today)) >= feedIntervalFor(b, intervalDays);
}

/** この個体に使う間隔。個体の指定がなければ全体の既定 */
export function feedIntervalFor(b: Beetle, fallback: number): number {
  return Math.max(1, b.feedIntervalDays ?? fallback);
}

/** 前回の給餌から何日たったか。記録がなければ null */
export function daysSinceFed(b: Beetle, today = todayStr()): number | null {
  if (!b.lastFedDate) return null;
  return Math.max(0, daysBetween(b.lastFedDate, new Date(today)));
}

/** 「今日」「3日前」など。記録がなければ null */
export function feedAgoLabel(b: Beetle, today = todayStr()): string | null {
  const d = daysSinceFed(b, today);
  if (d == null) return null;
  return d === 0 ? "今日" : `${d}日前`;
}

/** 給餌の対象と、そのうち交換が必要なもの */
export function feedingSummary(beetles: Beetle[], intervalDays = 1, today = todayStr()) {
  const targets = beetles.filter(isFeedTarget);
  const pending = targets.filter((b) => needsFeeding(b, intervalDays, today));
  return { targets, pending, done: targets.length - pending.length };
}

/** この個体に与える餌。個体ごとの指定がなければ全体の既定を使う */
export function foodFor(b: Beetle, fallback: string): string {
  return b.foodType?.trim() || fallback;
}

/** ふだん使う餌の候補 */
export const FOOD_OPTIONS = [
  "プロゼリー",
  "黒糖ゼリー",
  "高タンパクゼリー",
  "昆虫ゼリー",
  "バナナ",
];

/** エサ替えの間隔の候補 (日) */
export const FEED_INTERVAL_OPTIONS = [1, 2, 3, 4, 7];

export function feedIntervalLabel(days: number): string {
  return days === 1 ? "毎日" : `${days}日おき`;
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

/**
 * 育成の目安の既定値。
 *
 * 蛹期間は飼育情報サイトで「4〜8週」とされることが多く、掘り出しは
 * 「羽化から1ヶ月ほど、大型種は2ヶ月」が目安。以前は 21〜40日 / 25日と
 * していたが、どの情報源より早く、体が固まる前に掘り出しを促していた。
 * 待ちすぎて困ることはないが早すぎると個体を傷めるので、安全側に寄せている。
 * 実際に使う値は設定から変えられる。
 */
export const DEFAULT_SCHEDULE: ScheduleSettings = {
  pupaDaysMin: 28,
  pupaDaysMax: 56,
  digOutDays: 30,
  bottleChangeDays: 90,
};

/** 蛹化日から羽化見込み日を返す */
/** 「30日経過」か「あと5日」。カレンダーには先の作業も並ぶ */
function elapsedLabel(days: number): string {
  return days >= 0 ? `${days}日経過` : `あと${-days}日`;
}

/** 日付に日数を足す。YYYY-MM-DD で返す */
export function addDays(date: string, n: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

export function expectedEmergeDate(pupaDate: string, sc: ScheduleSettings): string {
  const d = new Date(pupaDate);
  d.setDate(d.getDate() + sc.pupaDaysMin);
  return d.toISOString().split("T")[0];
}

/** 羽化日から掘り出し目安日を返す */
export function expectedDigOutDate(emergedDate: string, sc: ScheduleSettings): string {
  const d = new Date(emergedDate);
  d.setDate(d.getDate() + sc.digOutDays);
  return d.toISOString().split("T")[0];
}

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

/** 費目ごとの数の単位。ユーザーが変えたければ上書きできる */
export const DEFAULT_UNIT: Record<ExpenseCategory, string> = {
  "ゼリー": "個",
  "菌糸ビン": "本",
  "マット": "L",
  "産卵材": "本",
  "器具・用品": "個",
  "その他": "個",
};

export function unitOf(e: Expense): string {
  return e.unit?.trim() || DEFAULT_UNIT[e.category];
}

/** 1個あたりいくらか。数が入っていなければ出せない */
export function unitPrice(e: Expense): number | null {
  if (!e.quantity || e.quantity <= 0) return null;
  return e.amountYen / e.quantity;
}

export interface PackBreakdown {
  /** 単価 × 購入数 */
  totalYen: number;
  /** 入り数 × 購入数。ぜんぶでいくつ */
  totalQty: number;
  /** 単価 ÷ 入り数。1個あたりの値段 */
  perUnitYen: number;
}

/**
 * 「50個入り ¥900 を2袋」から、合計と1個あたりを出す。
 * 購入数が空なら1つ買ったものとして扱う (いちばん多い買い方なので)。
 * 入り数が空なら1つ入りとして扱う (産卵材のように袋で数えないもの)。
 */
export function packBreakdown(
  packPriceYen: number | null,
  perPack: number | null,
  packs: number | null
): PackBreakdown | null {
  if (packPriceYen == null || packPriceYen <= 0) return null;
  const n = packs != null && packs > 0 ? packs : 1;
  const per = perPack != null && perPack > 0 ? perPack : 1;
  return {
    totalYen: packPriceYen * n,
    totalQty: per * n,
    perUnitYen: packPriceYen / per,
  };
}

/**
 * 直近に買ったものから単価を拾う。
 * 同じ費目を何度も買っていれば、いちばん新しい記録を使う。
 */
export function latestUnitPrice(
  expenses: Expense[],
  category: ExpenseCategory
): number | null {
  const withQty = expenses
    .filter((e) => e.category === category && unitPrice(e) != null)
    .sort((a, b) => b.date.localeCompare(a.date));
  return withQty.length > 0 ? unitPrice(withQty[0]) : null;
}

/** 半分に割ってあげることがあるので 0.5 刻み */
export const JELLY_PER_FEED_OPTIONS = [0.5, 1, 1.5, 2];

export function jellyCountLabel(n: number): string {
  return n === 0.5 ? "半分" : `${n}個`;
}

/** 1回にあげるゼリーの数。未設定は1個 */
export function jellyPerFeed(b: Beetle): number {
  const n = b.jellyPerFeed;
  return n != null && n > 0 ? n : 1;
}

export interface JellyForecast {
  /** エサやりの対象になっている頭数 */
  targets: number;
  /** 1か月あたりの個数 */
  perMonth: number;
  /** 単価が分かっていれば1か月あたりの金額 */
  costPerMonth: number | null;
}

/**
 * いまの頭数・間隔・1回の数から、ゼリーが1か月にどれだけ要るかを見積もる。
 * 実績ではなく見込みなので、あくまで買い置きの目安として出す。
 */
export function jellyForecast(
  beetles: Beetle[],
  intervalDays: number,
  unitYen: number | null
): JellyForecast {
  const targets = beetles.filter(isFeedTarget);
  const perMonth = targets.reduce(
    (sum, b) => sum + (jellyPerFeed(b) / feedIntervalFor(b, intervalDays)) * 30,
    0
  );
  return {
    targets: targets.length,
    perMonth,
    costPerMonth: unitYen == null ? null : perMonth * unitYen,
  };
}

/**
 * みんなで使うものを1頭あたりに割る。
 * ダニ避けスプレーのように、どの個体に使ったか分けられない出費が対象。
 */
export function perHeadShare(totalYen: number, heads: number): number | null {
  return heads > 0 ? totalYen / heads : null;
}

/**
 * 野外採集個体かどうか。累代が WD のものだけ。
 * WF1 は「野外個体から採れた子」なので飼育品として数える。
 */
export function isWildCaught(b: Beetle): boolean {
  return (b.generation ?? "").trim().toUpperCase() === "WD";
}

export interface SpeciesRecord {
  species: string;
  /** 飼育品の自己ベスト */
  bred?: Beetle;
  /** 野外品の自己ベスト */
  wild?: Beetle;
  /** その種で記録した頭数 (体長が入っているもの) */
  measured: number;
}

/**
 * 種ごとの自己ベスト。
 * 飼育品と野外品は育て方の話がまったく違うので分けて出す。
 * 明示的に外した個体と、体長が入っていない個体は数えない。
 */
export function speciesRecords(beetles: Beetle[]): SpeciesRecord[] {
  const bySpecies = new Map<string, Beetle[]>();
  for (const b of beetles) {
    if (b.sizeMm == null || b.excludeFromRecord) continue;
    const list = bySpecies.get(b.species) ?? [];
    list.push(b);
    bySpecies.set(b.species, list);
  }

  const best = (list: Beetle[]) =>
    list.length === 0
      ? undefined
      : list.reduce((a, b) => ((b.sizeMm ?? 0) > (a.sizeMm ?? 0) ? b : a));

  return [...bySpecies.entries()]
    .map(([species, list]) => ({
      species,
      bred: best(list.filter((b) => !isWildCaught(b))),
      wild: best(list.filter(isWildCaught)),
      measured: list.length,
    }))
    // 大きい種から並べる。自分の主戦場が上に来るように
    .sort((a, b) => bestSize(b) - bestSize(a));
}

function bestSize(r: SpeciesRecord): number {
  return Math.max(r.bred?.sizeMm ?? 0, r.wild?.sizeMm ?? 0);
}


export interface RankingFilters {
  /** 未指定なら全種。飼育している種類は人それぞれなので、選択肢は
   *  マスタの一覧からではなく、記録がある種類だけを実データから作る */
  species?: string;
  gender?: Gender;
  /** "bred" = 飼育品だけ、"wild" = 野外品だけ。未指定なら両方 */
  origin?: "bred" | "wild";
}

/**
 * サイズの大きい順に並べた一覧。speciesRecords は種類ごとの1位だけを見せるが、
 * こちらは条件を絞ったうえで全頭を見せる (2位・3位も追いたいという声から)。
 * 対象にする条件は speciesRecords と揃えている (体長があり、除外していない)。
 */
export function beetleRanking(beetles: Beetle[], filters: RankingFilters = {}): Beetle[] {
  return beetles
    .filter((b) => b.sizeMm != null && !b.excludeFromRecord)
    .filter((b) => filters.species == null || b.species === filters.species)
    .filter((b) => filters.gender == null || b.gender === filters.gender)
    .filter(
      (b) => filters.origin == null || (filters.origin === "wild") === isWildCaught(b)
    )
    .sort((a, b) => (b.sizeMm ?? 0) - (a.sizeMm ?? 0));
}

/** ランキングの絞り込みに出す種類の選択肢。記録がある種類だけ、五十音順 */
export function rankedSpeciesOptions(beetles: Beetle[]): string[] {
  const set = new Set(
    beetles.filter((b) => b.sizeMm != null && !b.excludeFromRecord).map((b) => b.species)
  );
  return [...set].sort((a, b) => a.localeCompare(b, "ja"));
}

export interface SpeciesGroup {
  species: string;
  items: Beetle[];
}

/**
 * 成虫一覧を種類ごとにまとめる。何種類も飼っている人向けの見せ方。
 * グループの並びは頭数が多い順 (よく飼っている種類が上に来るように)、
 * 同数なら五十音順。グループの中の並びは呼び出し側の並び順をそのまま使う
 * (すでにソート済みの配列を渡す前提)。
 */
export function groupBySpecies(beetles: Beetle[]): SpeciesGroup[] {
  const bySpecies = new Map<string, Beetle[]>();
  for (const b of beetles) {
    const list = bySpecies.get(b.species) ?? [];
    list.push(b);
    bySpecies.set(b.species, list);
  }
  return [...bySpecies.entries()]
    .map(([species, items]) => ({ species, items }))
    .sort((a, b) => b.items.length - a.items.length || a.species.localeCompare(b.species, "ja"));
}

/** 自分で羽化させた個体か。幼虫から引き上げたものだけ */
export function isSelfReared(b: Beetle): boolean {
  return b.sourceLarvaId != null;
}

export function formatYen(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

/**
 * ペアに付いた1つの金額を、2頭に割り振る。
 *
 * 個体は1頭ずつ別に持つので、金額もどちらかに寄せず分けて持たせる。
 * 足すと必ず元の金額に戻るようにしてあり、割り切れない1円はオス側に付く。
 * 半端を切り上げと切り捨てで別々に丸めると、合計が元とずれて総支出が
 * 1円多くなったり少なくなったりするため、片方は引き算で出す。
 */
export function splitPairAmount(total: number): [number, number] {
  const first = Math.ceil(total / 2);
  return [first, total - first];
}

/** 幼虫1頭あたりのコスト = 入手金額 + ビン・マット代の累計 */
export function larvaCost(larva: Larva): number {
  const bottles = larva.bottleChanges.reduce((sum, c) => sum + (c.costYen ?? 0), 0);
  return (larva.priceYen ?? 0) + bottles;
}

/** このレコードが表している頭数。未設定は1頭 */
export function headCount(larva: Larva): number {
  return Math.max(1, Math.floor(larva.count ?? 1));
}

/** レコードの頭数を合計する。まとまりは頭数ぶん数える */
export function totalHeads(larvae: Larva[]): number {
  return larvae.reduce((sum, l) => sum + headCount(l), 0);
}

/** まとまりの費用を1頭あたりに割る。表示にだけ使う (保存はしない) */
export function larvaCostPerHead(larva: Larva): number {
  return Math.round(larvaCost(larva) / headCount(larva));
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
  /** 作業の目安日 (YYYY-MM-DD)。カレンダーはこれで並べる */
  dueDate: string;
  /** ホームの一覧に出しはじめる日。目安日の少し前から知らせたい作業がある */
  showFrom: string;
}

/** ダッシュボード用: 今やるべき作業を導出する */
export function deriveUpcomingTasks(
  lines: BreedingLine[],
  larvae: Larva[],
  sc: ScheduleSettings,
  opts: { includeFuture?: boolean } = {}
): UpcomingTask[] {
  const tasks: UpcomingTask[] = [];
  // ホームの一覧は「まだ先」を出さない。今日やることに集中させるため
  const today = todayStr();
  const keep = (t: UpcomingTask) => opts.includeFuture || t.showFrom <= today;

  // ペアリング開始から1週間経過 → 産卵セット投入の目安
  for (const line of lines) {
    if (line.status === "pairing" && line.pairingDate) {
      const days = daysBetween(line.pairingDate);
      {
        tasks.push({
          id: `set-${line.id}`,
          kind: "set",
          title: `${line.name} 産卵セット投入`,
          detail: `ペアリング開始から${elapsedLabel(days)}`,
          overdue: days >= 14,
          dueDate: addDays(line.pairingDate, 7),
          showFrom: addDays(line.pairingDate, 7),
        });
      }
    }
    // セット投入から1ヶ月経過 → 割り出しの目安
    if ((line.status === "laying" || line.status === "waiting_split") && line.setDate) {
      const days = daysBetween(line.setDate);
      {
        tasks.push({
          id: `split-${line.id}`,
          kind: "split",
          title: `${line.name} 割り出し`,
          detail: `セット投入から${elapsedLabel(days)}`,
          overdue: days >= 60,
          dueDate: addDays(line.setDate, 30),
          showFrom: addDays(line.setDate, 30),
        });
      }
    }
  }

  for (const larva of larvae) {
    if (!larva.isAlive) continue;

    // 最終ビン交換から一定日数経過した幼虫 → ビン交換の目安 (蛹期・羽化後は対象外)
    if (isFeedingStage(larva.stage)) {
      const days = daysSinceLastChange(larva);
      if (days != null) {
        tasks.push({
          id: `bottle-${larva.id}`,
          kind: "bottle",
          title: `${larva.code} ビン交換`,
          detail: `前回交換から${elapsedLabel(days)}`,
          overdue: days >= sc.bottleChangeDays,
          dueDate: addDays(latestBottleChange(larva)!.date, sc.bottleChangeDays),
          showFrom: addDays(latestBottleChange(larva)!.date, sc.bottleChangeDays - 10),
        });
      }
    }

    // 蛹化から一定日数 → 羽化が近い (触らず見守る合図)
    if (larva.stage === "pupa" && larva.pupaDate) {
      const days = daysBetween(larva.pupaDate);
      {
        tasks.push({
          id: `emerge-${larva.id}`,
          kind: "emerge",
          title: `${larva.code} そろそろ羽化`,
          detail:
            days > sc.pupaDaysMax
              ? `蛹化から${days}日。羽化しているか確認を`
              : `蛹化から${elapsedLabel(days)}。触らず見守りましょう`,
          overdue: days > sc.pupaDaysMax,
          dueDate: addDays(larva.pupaDate, sc.pupaDaysMin),
          showFrom: addDays(larva.pupaDate, sc.pupaDaysMin - 5),
        });
      }
    }

    // 羽化から一定日数 → 掘り出しの目安
    if (larva.stage === "adult" && larva.emergedDate && !larva.dugOutDate) {
      const days = daysBetween(larva.emergedDate);
      {
        tasks.push({
          id: `digout-${larva.id}`,
          kind: "digout",
          title: `${larva.code} 掘り出し`,
          detail: `羽化から${elapsedLabel(days)}`,
          overdue: days >= sc.digOutDays + 14,
          dueDate: addDays(larva.emergedDate, sc.digOutDays),
          showFrom: addDays(larva.emergedDate, sc.digOutDays - 5),
        });
      }
    }
  }

  return tasks.filter(keep).sort((a, b) => Number(b.overdue) - Number(a.overdue));
}

/**
 * カレンダー用: まだ先の作業も含めて、期日つきで返す。
 * ホームの一覧は「いま」だけを見せるが、こちらは山がいつ来るかを見るためのもの。
 */
export function tasksByDate(
  lines: BreedingLine[],
  larvae: Larva[],
  sc: ScheduleSettings
): Map<string, UpcomingTask[]> {
  const byDate = new Map<string, UpcomingTask[]>();
  for (const t of deriveUpcomingTasks(lines, larvae, sc, { includeFuture: true })) {
    const list = byDate.get(t.dueDate) ?? [];
    list.push(t);
    byDate.set(t.dueDate, list);
  }
  return byDate;
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
