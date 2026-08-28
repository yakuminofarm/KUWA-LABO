import { describe, expect, it } from "vitest";
import { Beetle, Larva } from "@/types";
import {
  calcCostSummary,
  feedIntervalFor,
  formatYen,
  headCount,
  jellyForecast,
  larvaCost,
  larvaCostPerHead,
  needsFeeding,
  packBreakdown,
  perHeadShare,
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
