import { describe, expect, it } from "vitest";
import { Beetle, Larva } from "@/types";
import {
  beetleRanking,
  calcCostSummary,
  feedIntervalFor,
  formatYen,
  groupBySpecies,
  headCount,
  jellyForecast,
  larvaCost,
  larvaCostPerHead,
  needsFeeding,
  packBreakdown,
  perHeadShare,
  rankedSpeciesOptions,
  splitPairAmount,
  totalHeads,
} from "@/lib/breeding";

function beetle(overrides: Partial<Beetle> = {}): Beetle {
  return {
    id: "b1",
    code: "No.1",
    species: "オオクワガタ",
    gender: "male",
    acquiredDate: "2026-01-01",
    isAlive: true,
    notes: "",
    ...overrides,
  };
}

function larva(overrides: Partial<Larva> = {}): Larva {
  return {
    id: "l1",
    code: "26A-1",
    species: "オオクワガタ",
    stage: "L3",
    gender: "unknown",
    bottleChanges: [],
    isAlive: true,
    notes: "",
    ...overrides,
  };
}

describe("calcCostSummary", () => {
  it("合計は各内訳の単純な足し算になる", () => {
    const summary = calcCostSummary(
      [beetle({ priceYen: 3000 }), beetle({ id: "b2", priceYen: 1500, soldPriceYen: 8000 })],
      [
        larva({
          priceYen: 500,
          bottleChanges: [{ id: "c1", date: "2026-02-01", bottleType: "菌糸ビン", costYen: 600 }],
        }),
      ],
      [{ id: "e1", date: "2026-02-01", category: "ゼリー", amountYen: 1800 }]
    );
    expect(summary.beetlePurchase).toBe(4500);
    expect(summary.larvaPurchase).toBe(500);
    expect(summary.bottleCost).toBe(600);
    expect(summary.expenseTotal).toBe(1800);
    expect(summary.totalSpent).toBe(4500 + 500 + 600 + 1800);
    expect(summary.salesTotal).toBe(8000);
    expect(summary.balance).toBe(8000 - summary.totalSpent);
  });

  it("記録が0件でも壊れない", () => {
    const summary = calcCostSummary([], [], []);
    expect(summary.totalSpent).toBe(0);
    expect(summary.balance).toBe(0);
  });
});

describe("headCount / totalHeads", () => {
  it("未設定は1頭として扱う", () => {
    expect(headCount(larva())).toBe(1);
  });

  it("小数や0以下は1頭に丸める (壊れたデータで頭数が0や負になるのを防ぐ)", () => {
    expect(headCount(larva({ count: 0 }))).toBe(1);
    expect(headCount(larva({ count: -3 }))).toBe(1);
    expect(headCount(larva({ count: 2.9 }))).toBe(2);
  });

  it("複数レコードの頭数を合算する", () => {
    const total = totalHeads([larva({ count: 20 }), larva({ id: "l2", count: 5 }), larva({ id: "l3" })]);
    expect(total).toBe(20 + 5 + 1);
  });
});

describe("larvaCostPerHead", () => {
  it("まとまりの費用をそのままの頭数で割る", () => {
    const l = larva({
      priceYen: 6000,
      count: 20,
      bottleChanges: [{ id: "c1", date: "2026-02-01", bottleType: "マット", costYen: 0 }],
    });
    expect(larvaCost(l)).toBe(6000);
    expect(larvaCostPerHead(l)).toBe(300);
  });

  it("切り出し後 (1頭) は費用ぶんそのまま1頭あたりになる", () => {
    const one = larva({ priceYen: 300, count: 1 });
    expect(larvaCostPerHead(one)).toBe(300);
  });
});

describe("perHeadShare (みんなで使うものの按分)", () => {
  it("生体数で単純に割る", () => {
    expect(perHeadShare(2600, 13)).toBeCloseTo(200);
  });

  it("生体が0頭なら按分しようがないので null を返す (0除算を避ける)", () => {
    expect(perHeadShare(2600, 0)).toBeNull();
  });
});

describe("jellyForecast (ひと月のめやす)", () => {
  it("対象外の個体 (未後食・死亡・販売済み) は数えない", () => {
    const beetles = [
      beetle({ matured: true, lastFedDate: "2026-01-01" }),
      beetle({ id: "b2", matured: false }), // 後食前
      beetle({ id: "b3", matured: true, isAlive: false }), // 飼育終了
      beetle({ id: "b4", matured: true, soldPriceYen: 5000 }), // 販売済み
    ];
    const f = jellyForecast(beetles, 1, null);
    expect(f.targets).toBe(1);
  });

  it("頭数・1回の数・間隔から月間個数を計算する", () => {
    const beetles = [
      beetle({ matured: true }), // 既定: 1個・毎日
      beetle({ id: "b2", matured: true, jellyPerFeed: 2 }), // 2個・毎日
      beetle({ id: "b3", matured: true, jellyPerFeed: 0.5, feedIntervalDays: 2 }), // 半分・2日おき
    ];
    const f = jellyForecast(beetles, 1, 18);
    // (1/1 + 2/1 + 0.5/2) * 30 = 97.5
    expect(f.perMonth).toBeCloseTo(97.5);
    expect(f.costPerMonth).toBeCloseTo(97.5 * 18);
  });

  it("単価が分からなければ金額は出さない", () => {
    const f = jellyForecast([beetle({ matured: true })], 1, null);
    expect(f.costPerMonth).toBeNull();
  });
});

describe("packBreakdown (単価・入り数・購入数)", () => {
  it("50個入り900円を2袋 → 合計1800円・100個・1個18円", () => {
    const b = packBreakdown(900, 50, 2);
    expect(b).not.toBeNull();
    expect(b!.totalYen).toBe(1800);
    expect(b!.totalQty).toBe(100);
    expect(b!.perUnitYen).toBe(18);
  });

  it("購入数が空なら1つ買ったものとして扱う", () => {
    const b = packBreakdown(900, 50, null);
    expect(b!.totalYen).toBe(900);
    expect(b!.totalQty).toBe(50);
  });

  it("入り数が空なら1つ入りとして扱う (産卵材のように袋で数えないもの)", () => {
    const b = packBreakdown(500, null, 3);
    expect(b!.totalYen).toBe(1500);
    expect(b!.totalQty).toBe(3);
    expect(b!.perUnitYen).toBe(500);
  });

  it("単価が無ければ内訳は成立しない", () => {
    expect(packBreakdown(null, 50, 2)).toBeNull();
    expect(packBreakdown(0, 50, 2)).toBeNull();
  });
});

describe("feedIntervalFor / needsFeeding", () => {
  it("個体の上書きが優先され、なければ全体の既定を使う", () => {
    expect(feedIntervalFor(beetle(), 3)).toBe(3);
    expect(feedIntervalFor(beetle({ feedIntervalDays: 7 }), 3)).toBe(7);
  });

  it("後食前・飼育終了・販売済みはエサやりの対象にならない", () => {
    expect(needsFeeding(beetle({ matured: false }), 1, "2026-02-01")).toBe(false);
    expect(needsFeeding(beetle({ matured: true, isAlive: false }), 1, "2026-02-01")).toBe(false);
    expect(needsFeeding(beetle({ matured: true, soldPriceYen: 1000 }), 1, "2026-02-01")).toBe(false);
  });

  it("記録がなければ対象、間隔が来ていなければ対象外", () => {
    expect(needsFeeding(beetle({ matured: true }), 1, "2026-02-01")).toBe(true);
    expect(
      needsFeeding(beetle({ matured: true, lastFedDate: "2026-01-31" }), 3, "2026-02-01")
    ).toBe(false);
    expect(
      needsFeeding(beetle({ matured: true, lastFedDate: "2026-01-28" }), 3, "2026-02-01")
    ).toBe(true);
  });
});

describe("formatYen", () => {
  it("3桁区切りで¥を頭に付ける", () => {
    expect(formatYen(1234567)).toBe("¥1,234,567");
    expect(formatYen(0)).toBe("¥0");
  });
});

describe("splitPairAmount (ペアの金額を2頭に割り振る)", () => {
  it("割り切れる金額は半分ずつ", () => {
    expect(splitPairAmount(20000)).toEqual([10000, 10000]);
  });

  it("割り切れないときは足すと元に戻る (1円がどこかへ消えない)", () => {
    const [a, b] = splitPairAmount(15001);
    expect(a + b).toBe(15001);
    expect(a).toBe(7501);
    expect(b).toBe(7500);
  });

  it("どんな金額でも合計は必ず元の金額に一致する", () => {
    for (const total of [0, 1, 3, 999, 12345, 100000]) {
      const [a, b] = splitPairAmount(total);
      expect(a + b).toBe(total);
    }
  });
});

describe("beetleRanking (サイズランキング)", () => {
  it("体長の大きい順に並べる", () => {
    const list = [
      beetle({ id: "a", sizeMm: 70 }),
      beetle({ id: "b", sizeMm: 90 }),
      beetle({ id: "c", sizeMm: 80 }),
    ];
    expect(beetleRanking(list).map((b) => b.id)).toEqual(["b", "c", "a"]);
  });

  it("体長が無い・自己ベストから外した個体は対象にしない (speciesRecords と同じ条件)", () => {
    const list = [
      beetle({ id: "a", sizeMm: 90 }),
      beetle({ id: "b", sizeMm: undefined }),
      beetle({ id: "c", sizeMm: 95, excludeFromRecord: true }),
    ];
    expect(beetleRanking(list).map((b) => b.id)).toEqual(["a"]);
  });

  it("種類・性別・飼育/野外で絞り込める", () => {
    const list = [
      beetle({ id: "a", species: "オオクワガタ", gender: "male", sizeMm: 90, generation: "CBF1" }),
      beetle({ id: "b", species: "オオクワガタ", gender: "female", sizeMm: 50, generation: "CBF1" }),
      beetle({ id: "c", species: "ヒラタクワガタ", gender: "male", sizeMm: 70, generation: "WD" }),
    ];
    expect(beetleRanking(list, { species: "オオクワガタ" }).map((b) => b.id)).toEqual(["a", "b"]);
    expect(beetleRanking(list, { gender: "male" }).map((b) => b.id)).toEqual(["a", "c"]);
    expect(beetleRanking(list, { origin: "wild" }).map((b) => b.id)).toEqual(["c"]);
    expect(beetleRanking(list, { origin: "bred" }).map((b) => b.id)).toEqual(["a", "b"]);
  });
});

describe("rankedSpeciesOptions", () => {
  it("記録のある種類だけを五十音順で返す (マスタの全種類は使わない)", () => {
    const list = [
      beetle({ id: "a", species: "ヒラタクワガタ", sizeMm: 70 }),
      beetle({ id: "b", species: "オオクワガタ", sizeMm: 90 }),
      beetle({ id: "c", species: "ノコギリクワガタ", sizeMm: undefined }), // 対象外
    ];
    expect(rankedSpeciesOptions(list)).toEqual(["オオクワガタ", "ヒラタクワガタ"]);
  });
});

describe("groupBySpecies", () => {
  it("種類ごとにまとめ、頭数が多い種類を上にする", () => {
    const list = [
      beetle({ id: "a", species: "ヒラタクワガタ" }),
      beetle({ id: "b", species: "オオクワガタ" }),
      beetle({ id: "c", species: "オオクワガタ" }),
    ];
    const groups = groupBySpecies(list);
    expect(groups.map((g) => g.species)).toEqual(["オオクワガタ", "ヒラタクワガタ"]);
    expect(groups[0].items).toHaveLength(2);
  });

  it("グループ内の並び順は渡した配列の順番をそのまま保つ", () => {
    const list = [
      beetle({ id: "a", species: "オオクワガタ", code: "No.2" }),
      beetle({ id: "b", species: "オオクワガタ", code: "No.1" }),
    ];
    const groups = groupBySpecies(list);
    expect(groups[0].items.map((b) => b.id)).toEqual(["a", "b"]);
  });
});
