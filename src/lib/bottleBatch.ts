/**
 * まとめてビン交換。
 *
 * 割り出しで20頭採れたら、20頭ぶんのビン交換を1頭ずつ開いて記録することになる。
 * 日付・ビンの種類・容量・値段はどの子も同じなので、**違うのは体重だけ**。
 * そこだけ1頭ずつ入れられるようにして、あとはまとめて記録する。
 */
import { BottleChange, Larva, ScheduleSettings } from "@/types";
import { daysSinceLastChange, headCount, isFeedingStage } from "@/lib/breeding";
import { SpeciesOverrides, scheduleFor } from "@/lib/speciesTuning";

import { generateId } from "@/lib/utils";

export interface BottleTarget {
  larva: Larva;
  /** 前回交換からの日数。まだ1本も入れていなければ null */
  days: number | null;
  /** そろそろ交換する頃か。まだ入れていない子も、入れる必要があるので true */
  due: boolean;
}

/**
 * 交換の対象になる幼虫。
 *
 * **エサを食べている段階の、生きている子だけ。** 蛹と羽化した子はビンを
 * 替えない。急ぐ子ほど前に出す (遅れているもの → 日数の長い順 → 番号順)。
 */
export function bottleTargets(
  larvae: readonly Larva[],
  schedule: ScheduleSettings,
  tuning: SpeciesOverrides = {}
): BottleTarget[] {
  const out: BottleTarget[] = [];
  for (const larva of larvae) {
    if (!larva.isAlive || !isFeedingStage(larva.stage)) continue;
    const days = daysSinceLastChange(larva) ?? null;
    const limit = scheduleFor(larva.species, schedule, tuning).bottleChangeDays;
    // まだ1本も入れていない子は、日数にかかわらず入れる必要がある
    out.push({ larva, days, due: days == null || days >= limit });
  }
  return out.sort((a, b) => {
    if (a.due !== b.due) return a.due ? -1 : 1;
    if (a.days !== b.days) return (b.days ?? Infinity) - (a.days ?? Infinity);
    return a.larva.code.localeCompare(b.larva.code, "ja");
  });
}

export interface BatchForm {
  date: string;
  bottleType: string;
  bottleSize: string;
  /** ビン1本の値段。まとまりの記録には頭数ぶんをかける */
  costYen: string;
  memo: string;
}

export function emptyBatchForm(): BatchForm {
  return {
    date: new Date().toISOString().split("T")[0],
    bottleType: "菌糸ビン",
    bottleSize: "800cc",
    costYen: "",
    memo: "",
  };
}

/**
 * 選んだ子ぶんの交換記録を作る。
 *
 * **値段はビン1本ぶんを受け取り、まとまりには頭数をかける。** 記録の costYen は
 * 「その記録ぜんぶの費用」という決まりなので (larvaCostPerHead が頭数で割る)、
 * 20頭のまとまりに1本ぶんだけ入れると、収支が19本ぶん足りなくなる。
 */
export function buildBottleChanges(
  rows: readonly { larva: Larva; weightG: string }[],
  form: BatchForm
): { larvaId: string; change: BottleChange }[] {
  const perBottle = form.costYen ? parseInt(form.costYen, 10) : undefined;
  const memo = form.memo.trim();

  return rows.map(({ larva, weightG }) => ({
    larvaId: larva.id,
    change: {
      id: generateId(),
      date: form.date,
      bottleType: form.bottleType,
      bottleSize: form.bottleSize || undefined,
      weightG: weightG ? parseFloat(weightG) : undefined,
      costYen:
        perBottle != null && Number.isFinite(perBottle)
          ? perBottle * headCount(larva)
          : undefined,
      memo: memo || undefined,
    },
  }));
}
