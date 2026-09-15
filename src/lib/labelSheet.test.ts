import { describe, expect, it } from "vitest";
import {
  LABEL_GRIDS,
  beetleLabel,
  labelFileName,
  larvaLabel,
  paginate,
  perSheet,
} from "@/lib/labelSheet";
import { Beetle, BreedingLine, Larva } from "@/types";

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

const line = (id: string, name: string): BreedingLine => ({
  id,
  name,
  species: "オオクワガタ",
  status: "split_done",
  notes: "",
});

describe("perSheet / paginate", () => {
  it("面の数は列×段", () => {
    for (const g of Object.values(LABEL_GRIDS)) {
      expect(g.cols * g.rows).toBeGreaterThan(0);
    }
    expect(perSheet("large")).toBe(LABEL_GRIDS.large.cols * LABEL_GRIDS.large.rows);
  });

  it("入りきらないぶんは次の紙に回す", () => {
    const items = Array.from({ length: 5 }, (_, i) => i);
    expect(paginate(items, 2)).toEqual([[0, 1], [2, 3], [4]]);
  });

  it("ちょうど収まるときに空の紙を作らない", () => {
    expect(paginate([1, 2], 2)).toHaveLength(1);
  });

  it("何も無ければ1枚も作らない", () => {
    expect(paginate([], 10)).toEqual([]);
  });
});

describe("beetleLabel", () => {
  it("ケースを開けずに分かることを並べる", () => {
    const l = beetleLabel(
      beetle({ locality: "能勢YG血統", generation: "CBF2", sizeMm: 85.5 })
    );
    expect(l.code).toBe("26OK-A1");
    expect(l.lines).toEqual(["オオクワガタ", "能勢YG血統", "CBF2 ♂ 85.5mm"]);
  });

  it("空の項目は行そのものを作らない", () => {
    expect(beetleLabel(beetle({ gender: "unknown" })).lines).toEqual(["オオクワガタ"]);
  });

  it("管理番号が空でも空白のラベルにはしない", () => {
    expect(beetleLabel(beetle({ code: "" })).code).toBe("番号なし");
  });

  // 貼った紙は人の目に入る。金額は載せない (個体カード・血統書と同じ方針)
  it("金額は載せない", () => {
    const l = beetleLabel(beetle({ priceYen: 28000, soldPriceYen: 40000 }));
    expect([l.code, ...l.lines].join("|")).not.toMatch(/28000|40000|円/);
  });
});

describe("larvaLabel", () => {
  it("出身ラインと、最後にビンを替えた日を入れる", () => {
    const l = larvaLabel(
      larva({
        lineId: "L1",
        count: 3,
        bottleChanges: [
          { id: "c1", date: "2026-02-01", bottleType: "菌糸ビン", bottleSize: "800cc" },
          { id: "c2", date: "2026-05-10", bottleType: "菌糸ビン", bottleSize: "1400cc" },
        ],
      }),
      [line("L1", "2026-A")]
    );
    expect(l.lines).toEqual(["オオクワガタ", "2026-A 3頭", "ビン 2026-05-10 1400cc"]);
  });

  it("1頭のまとまりに頭数は書かない", () => {
    const l = larvaLabel(larva({ lineId: "L1" }), [line("L1", "2026-A")]);
    expect(l.lines).toEqual(["オオクワガタ", "2026-A"]);
  });

  it("ビンを替えたことが無ければその行は出ない", () => {
    expect(larvaLabel(larva(), []).lines).toEqual(["オオクワガタ"]);
  });

  // 予定は刷らない。紙は貼ったあと直せないので、変わると嘘になる
  it("次の交換の目安のような予定は入れない", () => {
    const l = larvaLabel(
      larva({ bottleChanges: [{ id: "c1", date: "2026-05-10", bottleType: "菌糸ビン" }] }),
      []
    );
    expect(l.lines.join("|")).not.toMatch(/予定|目安|あと\d+日/);
  });
});

describe("labelFileName", () => {
  it("1枚のときは枚数を入れない", () => {
    expect(labelFileName(0, 1)).toBe("kuwa-labels.jpg");
  });

  it("何枚かあるときは順番が分かる名前にする", () => {
    expect(labelFileName(0, 3)).toBe("kuwa-labels-1of3.jpg");
    expect(labelFileName(2, 3)).toBe("kuwa-labels-3of3.jpg");
  });
});
