import { describe, expect, it } from "vitest";
import { Larva, ScheduleSettings } from "@/types";
import { bottleTargets, buildBottleChanges, emptyBatchForm } from "@/lib/bottleBatch";

const SCHEDULE: ScheduleSettings = {
  pupaDaysMin: 30,
  pupaDaysMax: 60,
  digOutDays: 21,
  bottleChangeDays: 90,
};

/** date から days 日前の日付 */
function ago(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function larva(o: Partial<Larva> = {}): Larva {
  return {
    id: "l1",
    code: "2026-A-01",
    species: "オオクワガタ",
    stage: "L3",
    gender: "unknown",
    bottleChanges: [],
    isAlive: true,
    notes: "",
    ...o,
  };
}

const bottle = (date: string) => ({ id: "c1", date, bottleType: "菌糸ビン" });

describe("bottleTargets", () => {
  it("エサを食べている段階の子だけ出す", () => {
    const list = [
      larva({ id: "a", stage: "L3" }),
      larva({ id: "b", stage: "pupa" }),
      larva({ id: "c", stage: "adult" }),
      larva({ id: "d", stage: "egg" }),
    ];
    expect(bottleTargets(list, SCHEDULE).map((t) => t.larva.id)).toEqual(["a"]);
  });

  it("飼育を終えた子は出さない", () => {
    expect(bottleTargets([larva({ isAlive: false })], SCHEDULE)).toEqual([]);
  });

  it("まだ1本も入れていない子は、日数にかかわらず対象になる", () => {
    const [t] = bottleTargets([larva()], SCHEDULE);
    expect(t.days).toBeNull();
    expect(t.due).toBe(true);
  });

  it("目安の日数を過ぎていれば、そろそろの子", () => {
    const [t] = bottleTargets([larva({ bottleChanges: [bottle(ago(95))] })], SCHEDULE);
    expect(t.due).toBe(true);
    expect(t.days).toBe(95);
  });

  it("入れたばかりの子は、そろそろではない", () => {
    const [t] = bottleTargets([larva({ bottleChanges: [bottle(ago(5))] })], SCHEDULE);
    expect(t.due).toBe(false);
  });

  it("急ぐ子ほど前に出す", () => {
    const list = [
      larva({ id: "new", code: "C", bottleChanges: [bottle(ago(5))] }),
      larva({ id: "late", code: "B", bottleChanges: [bottle(ago(120))] }),
      larva({ id: "none", code: "A" }),
    ];
    // まだ入れていない子 → いちばん遅れている子 → まだの子
    expect(bottleTargets(list, SCHEDULE).map((t) => t.larva.id)).toEqual([
      "none",
      "late",
      "new",
    ]);
  });

  it("品種ごとの目安があればそちらで見る", () => {
    const list = [larva({ species: "ニジイロクワガタ", bottleChanges: [bottle(ago(40))] })];
    const tuning = { ニジイロクワガタ: { bottleChangeDays: 30 } };
    expect(bottleTargets(list, SCHEDULE)[0].due).toBe(false);
    expect(bottleTargets(list, SCHEDULE, tuning)[0].due).toBe(true);
  });
});

describe("buildBottleChanges", () => {
  const form = { ...emptyBatchForm(), date: "2026-09-28", costYen: "850", memo: " 詰め替え " };

  it("選んだ子ぶんの記録を作る", () => {
    const out = buildBottleChanges(
      [
        { larva: larva({ id: "a" }), weightG: "32" },
        { larva: larva({ id: "b" }), weightG: "" },
      ],
      form
    );
    expect(out.map((x) => x.larvaId)).toEqual(["a", "b"]);
    expect(out[0].change.weightG).toBe(32);
    expect(out[1].change.weightG).toBeUndefined();
  });

  it("日付・種類・容量・メモは同じものを入れる", () => {
    const [{ change }] = buildBottleChanges([{ larva: larva(), weightG: "" }], form);
    expect(change.date).toBe("2026-09-28");
    expect(change.bottleType).toBe("菌糸ビン");
    expect(change.bottleSize).toBe("800cc");
    expect(change.memo).toBe("詰め替え");
  });

  it("まとまりの記録には、値段を頭数ぶんかける", () => {
    // 20頭のまとまりに1本ぶんだけ入れると、収支が19本ぶん足りなくなる
    const [{ change }] = buildBottleChanges(
      [{ larva: larva({ count: 20 }), weightG: "" }],
      form
    );
    expect(change.costYen).toBe(850 * 20);
  });

  it("1頭の記録はそのままの値段", () => {
    const [{ change }] = buildBottleChanges([{ larva: larva(), weightG: "" }], form);
    expect(change.costYen).toBe(850);
  });

  it("値段を入れなければ、費用は記録しない", () => {
    const [{ change }] = buildBottleChanges(
      [{ larva: larva(), weightG: "" }],
      { ...form, costYen: "" }
    );
    expect(change.costYen).toBeUndefined();
  });

  it("記録ごとに別の id を振る", () => {
    const out = buildBottleChanges(
      [
        { larva: larva({ id: "a" }), weightG: "" },
        { larva: larva({ id: "b" }), weightG: "" },
      ],
      form
    );
    expect(out[0].change.id).not.toBe(out[1].change.id);
  });
});
