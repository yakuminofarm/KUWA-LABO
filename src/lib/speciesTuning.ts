/**
 * 品種ごとの目安。
 *
 * エサの減りかたも、蛹から羽化までの日数も、ビンの持ちも品種で違う。
 * それを全体で1つの値にしていたので、種を混ぜて飼うほど合わなくなっていた。
 *
 * 効かせる順番は 個体 → 品種 (本人が直した値) → 品種 (AIの目安) → 全体設定。
 *
 * ## AIの目安について
 *
 * 下の表は、飼育の一般的なやり方から Claude (AI) が出した**出発点**であり、
 * 文献や実測から取った数字ではない。実際には品種よりも
 * **温度と、菌糸かマットかのほうが効く**。画面でもAIが入れた値だと分かるように
 * 出し、本人が直せるようにしてある。
 *
 * 値は品種ごとに1つずつ決めるのではなく、飼育のしかたが似たものを
 * まとめて決めている。25種ぶんの数字を個別に並べると、
 * 調べがついているように見えてしまうため。
 *
 * この目安は記録には書き込まない。書き込むと、あとで目安を直しても
 * 古い値が残り、どれが本人の決めた値なのかも分からなくなる。
 */
import { ScheduleSettings } from "@/types";

/** 品種ごとに変えられる値 */
export interface SpeciesTuning {
  /** 何日おきにエサを替えるか */
  feedIntervalDays: number;
  pupaDaysMin: number;
  pupaDaysMax: number;
  digOutDays: number;
  bottleChangeDays: number;
}

export type TuningPatch = Partial<SpeciesTuning>;

/** 値がどこから来たか */
export type TuningSource = "user" | "ai" | "global";

interface Husbandry {
  /** 画面に出す分類名 */
  label: string;
  /** なぜその値なのか。画面にも出す */
  why: string;
  species: string[];
  values: TuningPatch;
}

/**
 * 飼育のしかたで分けた分類と、その目安。
 * 全体の既定 (蛹28〜56日・掘り出し30日・ビン90日) と変わらないところは、
 * わざわざ書かずに全体設定へ任せる。
 */
export const HUSBANDRY_GROUPS: Husbandry[] = [
  {
    label: "オオクワ系",
    why: "菌糸ビンで育て、羽化してから餌を食べ始めるまでが長い種類。",
    species: [
      "オオクワガタ",
      "ヒメオオクワガタ",
      "ホペイオオクワガタ",
      "タイワンオオクワガタ",
      "アンタエウスオオクワガタ",
    ],
    values: { feedIntervalDays: 3, pupaDaysMin: 21, pupaDaysMax: 45, digOutDays: 30, bottleChangeDays: 90 },
  },
  {
    label: "ヒラタ系",
    why: "体が大きく、成虫がよく食べる種類。",
    species: [
      "ヒラタクワガタ",
      "パラワンオオヒラタ",
      "スマトラオオヒラタ",
      "アルキデスヒラタクワガタ",
      "ダイオウヒラタクワガタ",
    ],
    values: { feedIntervalDays: 2, pupaDaysMin: 25, pupaDaysMax: 50, digOutDays: 25, bottleChangeDays: 90 },
  },
  {
    label: "ノコギリ・ミヤマ",
    why: "マットで育て、羽化したあとそのまま眠って翌年に動き出すことがある種類。",
    species: ["ノコギリクワガタ", "ミヤマクワガタ"],
    values: { feedIntervalDays: 3, pupaDaysMin: 21, pupaDaysMax: 45, digOutDays: 40, bottleChangeDays: 120 },
  },
  {
    label: "小型種",
    why: "体が小さく、エサの減りがゆっくりな種類。",
    species: ["コクワガタ", "アカアシクワガタ", "ネブトクワガタ"],
    values: { feedIntervalDays: 4, pupaDaysMin: 18, pupaDaysMax: 35, digOutDays: 25, bottleChangeDays: 120 },
  },
  {
    label: "ニジイロ・キンイロ",
    why: "マットで育ち、卵から羽化までが早い種類。",
    species: ["ニジイロクワガタ", "パプアキンイロクワガタ"],
    values: { feedIntervalDays: 3, pupaDaysMin: 18, pupaDaysMax: 35, digOutDays: 20, bottleChangeDays: 100 },
  },
  {
    label: "ツヤ・オウゴンオニ",
    why: "カワラ菌糸で育てる種類。蛹の期間が長めになりやすい。",
    species: [
      "タランドゥスオオツヤクワガタ",
      "レギウスオオツヤクワガタ",
      "インターメディアツヤクワガタ",
      "オウゴンオニクワガタ",
    ],
    values: { feedIntervalDays: 3, pupaDaysMin: 28, pupaDaysMax: 56, digOutDays: 30, bottleChangeDays: 90 },
  },
  {
    label: "フタマタ・ホソアカ・ギラファ",
    why: "大型で動きがよく、成虫がよく食べる種類。",
    species: [
      "ギラファノコギリクワガタ",
      "セアカフタマタクワガタ",
      "マンディブラリスフタマタクワガタ",
      "メタリフェルホソアカクワガタ",
    ],
    values: { feedIntervalDays: 2, pupaDaysMin: 25, pupaDaysMax: 50, digOutDays: 25, bottleChangeDays: 90 },
  },
];

const BY_SPECIES = new Map<string, Husbandry>(
  HUSBANDRY_GROUPS.flatMap((g) => g.species.map((s) => [s, g] as const))
);

/** その品種に当てはまる分類。「その他」や自由入力の品種には無い */
export function husbandryOf(species: string): Husbandry | undefined {
  return BY_SPECIES.get(species);
}

/** AIが用意している目安 (無ければ空) */
export function aiTuning(species: string): TuningPatch {
  return husbandryOf(species)?.values ?? {};
}

/** 本人が直した値を品種ごとに持つ入れ物 */
export type SpeciesOverrides = Record<string, TuningPatch>;

/**
 * その品種で実際に使う値。
 * 本人が直した値 → AIの目安 → 全体設定 の順に探す
 */
export function tuningFor(
  species: string,
  schedule: ScheduleSettings,
  feedIntervalDays: number,
  overrides: SpeciesOverrides = {}
): SpeciesTuning {
  const base: SpeciesTuning = { ...schedule, feedIntervalDays };
  const ai = aiTuning(species);
  const mine = overrides[species] ?? {};

  const pick = <K extends keyof SpeciesTuning>(key: K): number =>
    mine[key] ?? ai[key] ?? base[key];

  return {
    feedIntervalDays: pick("feedIntervalDays"),
    pupaDaysMin: pick("pupaDaysMin"),
    pupaDaysMax: pick("pupaDaysMax"),
    digOutDays: pick("digOutDays"),
    bottleChangeDays: pick("bottleChangeDays"),
  };
}

/** その値がどこから来たか (画面で出どころを示すため) */
export function sourceOf(
  species: string,
  key: keyof SpeciesTuning,
  overrides: SpeciesOverrides = {}
): TuningSource {
  if (overrides[species]?.[key] != null) return "user";
  if (aiTuning(species)[key] != null) return "ai";
  return "global";
}

/**
 * その品種のエサの間隔。
 * 育成の日数と違って単独で使うことが多いので、別に出せるようにしてある
 */
export function feedIntervalForSpecies(
  species: string,
  fallback: number,
  overrides: SpeciesOverrides = {}
): number {
  return overrides[species]?.feedIntervalDays ?? aiTuning(species).feedIntervalDays ?? fallback;
}

/** 品種ごとの育成の目安だけ取り出す (ScheduleSettings として渡したいとき) */
export function scheduleFor(
  species: string,
  schedule: ScheduleSettings,
  overrides: SpeciesOverrides = {}
): ScheduleSettings {
  const t = tuningFor(species, schedule, 1, overrides);
  return {
    pupaDaysMin: t.pupaDaysMin,
    pupaDaysMax: t.pupaDaysMax,
    digOutDays: t.digOutDays,
    bottleChangeDays: t.bottleChangeDays,
  };
}
