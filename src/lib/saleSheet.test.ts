import { describe, expect, it } from "vitest";
import {
  USABLE_WIDTH,
  columnsFor,
  rowsPerPage,
  saleListFileName,
  saleRow,
  unitCost,
} from "@/lib/saleSheet";
import { Beetle, Larva } from "@/types";

const beetle = (extra: Partial<Beetle> = {}): Beetle => ({
  id: "b1",
  code: "26OK-A1",
  species: "オオクワガタ",
  gender: "male",
  acquiredDate: "2026-01-01",
  isAlive: true,
  notes: "",
  ...extra,
});

const larva = (extra: Partial<Larva> = {}): Larva => ({
  id: "v1",
  code: "2026-A-01",
  species: "オオクワガタ",
  stage: "L3",
  gender: "unknown",
  bottleChanges: [],
  isAlive: true,
  notes: "",
  ...extra,
});

describe("unitCost", () => {
  it("買ってきた個体は入手金額", () => {
    expect(unitCost(beetle({ priceYen: 28000 }), [])).toBe(28000);
  });

  // 引き上げのときに入手金額を写していないので、幼虫まで遡らないと出てこない
  it("自分で羽化させた個体は、元の幼虫にかかった額", () => {
    const from = larva({
      priceYen: 1000,
      bottleChanges: [
        { id: "c1", date: "2026-01-01", bottleType: "菌糸ビン", costYen: 600 },
        { id: "c2", date: "2026-05-01", bottleType: "菌糸ビン", costYen: 800 },
      ],
    });
    expect(unitCost(beetle({ sourceLarvaId: "v1" }), [from])).toBe(2400);
  });

  it("まとまりから引き上げた個体は1頭ぶんにする", () => {
    const from = larva({
      count: 4,
      bottleChanges: [{ id: "c1", date: "2026-01-01", bottleType: "菌糸ビン", costYen: 4000 }],
    });
    expect(unitCost(beetle({ sourceLarvaId: "v1" }), [from])).toBe(1000);
  });

  it("どちらも分からなければ空のまま", () => {
    expect(unitCost(beetle(), [])).toBeUndefined();
    expect(unitCost(beetle({ sourceLarvaId: "消えた幼虫" }), [])).toBeUndefined();
  });
});

describe("saleRow", () => {
  it("並べる項目を文字にする", () => {
    const r = saleRow(
      beetle({ locality: "能勢YG血統", generation: "CBF2", sizeMm: 85.5, emergedDate: "2026-06-20" }),
      []
    );
    expect(r.code).toBe("26OK-A1");
    expect(r.gender).toBe("♂");
    expect(r.size).toBe("85.5");
    expect(r.emerged).toBe("2026/06/20");
  });

  it("空の項目は空のまま (—で埋めない)", () => {
    const r = saleRow(beetle(), []);
    expect(r.locality).toBe("");
    expect(r.emerged).toBe("");
    expect(r.cost).toBe("");
  });

  it("性別が分からない個体も並べられる", () => {
    expect(saleRow(beetle({ gender: "unknown" }), []).gender).toBe("—");
  });
});

describe("表の日付", () => {
  it("詰めた形にする (列に入りきらないため)", () => {
    expect(saleRow(beetle({ emergedDate: "2026-06-20" }), []).emerged).toBe("2026/06/20");
  });

  // 月までしか分かっていない日付を「6月1日」と書くと、正確に見えてしまう
  it("月までしか分からない日付は日を作らない", () => {
    const r = saleRow(
      beetle({ emergedDate: "2026-06-01", emergedDatePrecision: "month" }),
      []
    );
    expect(r.emerged).toBe("2026/06ごろ");
  });
});

describe("columnsFor", () => {
  it("どちらの型も紙の幅ぴったりに収まる", () => {
    for (const kind of ["handout", "mine"] as const) {
      const sum = columnsFor(kind).reduce((n, c) => n + c.width, 0);
      expect(sum, kind).toBe(USABLE_WIDTH);
    }
  });

  it("どの列も潰れない幅になる", () => {
    for (const kind of ["handout", "mine"] as const) {
      for (const c of columnsFor(kind)) expect(c.width, `${kind}/${c.label}`).toBeGreaterThanOrEqual(80);
    }
  });

  // 配布用に原価が混ざるのは、仕入れ値を客に見せるということ
  it("配布用に原価の列を作らない", () => {
    const labels = columnsFor("handout").map((c) => c.label);
    expect(labels).not.toContain("原価");
    expect(columnsFor("mine").map((c) => c.label)).toContain("原価");
  });

  it("配布用の行に原価は入らない", () => {
    const row = saleRow(beetle({ priceYen: 28000 }), []);
    const printed = columnsFor("handout").map((c) => c.value(row)).join("|");
    expect(printed).not.toContain("28,000");
    expect(columnsFor("mine").map((c) => c.value(row)).join("|")).toContain("28,000");
  });
});

describe("rowsPerPage", () => {
  it("手元用は断り書きのぶん、1枚に入る行が少ない", () => {
    expect(rowsPerPage("mine")).toBeLessThan(rowsPerPage("handout"));
  });

  it("どちらも実用になる行数が入る", () => {
    expect(rowsPerPage("handout")).toBeGreaterThanOrEqual(20);
  });
});

describe("saleListFileName", () => {
  it("手元用と配布用で名前を分ける", () => {
    expect(saleListFileName("handout", 0, 1)).toBe("kuwa-list.jpg");
    expect(saleListFileName("mine", 0, 1)).toBe("kuwa-mine.jpg");
  });

  it("何枚かあるときは順番が分かる名前にする", () => {
    expect(saleListFileName("handout", 1, 3)).toBe("kuwa-list-2of3.jpg");
  });
});
