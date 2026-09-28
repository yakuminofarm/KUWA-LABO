import { describe, expect, it } from "vitest";
import { FED_HISTORY_MAX, fedDatesOf, feedingStats, withFed, withoutFed } from "@/lib/feeding";

describe("fedDatesOf", () => {
  it("履歴があればそれを返す", () => {
    expect(fedDatesOf({ fedDates: ["2026-09-01", "2026-09-02"] })).toEqual([
      "2026-09-01",
      "2026-09-02",
    ]);
  });

  it("履歴を持つ前の記録は、最後にあげた日を1日ぶんとして読む", () => {
    // 古い記録を書き換えずに、読むときだけそろえる
    expect(fedDatesOf({ lastFedDate: "2026-09-01" })).toEqual(["2026-09-01"]);
  });

  it("一度もあげていなければ空", () => {
    expect(fedDatesOf({})).toEqual([]);
  });
});

describe("withFed", () => {
  it("あげた日を足して、最後にあげた日も更新する", () => {
    expect(withFed({ fedDates: ["2026-09-01"] }, "2026-09-02")).toEqual({
      fedDates: ["2026-09-01", "2026-09-02"],
      lastFedDate: "2026-09-02",
    });
  });

  it("同じ日を二度押しても増えない", () => {
    expect(withFed({ fedDates: ["2026-09-02"] }, "2026-09-02").fedDates).toEqual(["2026-09-02"]);
  });

  it("古い記録に足すと、履歴として残りはじめる", () => {
    expect(withFed({ lastFedDate: "2026-09-01" }, "2026-09-02").fedDates).toEqual([
      "2026-09-01",
      "2026-09-02",
    ]);
  });

  it("日付の順に並べる", () => {
    expect(withFed({ fedDates: ["2026-09-05"] }, "2026-09-02").fedDates).toEqual([
      "2026-09-02",
      "2026-09-05",
    ]);
  });

  it("上限を超えたら、古いほうから落とす", () => {
    const many = Array.from({ length: FED_HISTORY_MAX }, (_, i) => `2020-01-${i}`);
    const out = withFed({ fedDates: many }, "2026-09-02").fedDates!;
    expect(out).toHaveLength(FED_HISTORY_MAX);
    expect(out[out.length - 1]).toBe("2026-09-02");
  });
});

describe("withoutFed", () => {
  it("その日のぶんを外す", () => {
    expect(withoutFed({ fedDates: ["2026-09-01", "2026-09-02"] }, "2026-09-02")).toEqual({
      fedDates: ["2026-09-01"],
      lastFedDate: "2026-09-01",
    });
  });

  it("最後にあげた日は、その前の日に戻す", () => {
    // 消して「一度もあげていない」にするのは、取り消しとして行きすぎている
    const out = withoutFed({ fedDates: ["2026-08-20", "2026-09-02"] }, "2026-09-02");
    expect(out.lastFedDate).toBe("2026-08-20");
  });

  it("1日しか無ければ、一度もあげていない状態に戻る", () => {
    expect(withoutFed({ fedDates: ["2026-09-02"] }, "2026-09-02")).toEqual({
      fedDates: undefined,
      lastFedDate: undefined,
    });
  });

  it("古い記録の取り消しもできる", () => {
    expect(withoutFed({ lastFedDate: "2026-09-02" }, "2026-09-02").lastFedDate).toBeUndefined();
  });
});

describe("feedingStats", () => {
  const today = "2026-09-30";

  it("積んである日数と、直近30日の回数を数える", () => {
    const dates = ["2026-07-01", "2026-09-20", "2026-09-25", "2026-09-30"];
    const s = feedingStats(dates, today);
    expect(s.total).toBe(4);
    expect(s.recent).toBe(3);
  });

  it("直近の間隔の平均を出す", () => {
    // 9/20 → 9/25 → 9/30 は、5日おきが2回
    expect(feedingStats(["2026-09-20", "2026-09-25", "2026-09-30"], today).averageDays).toBe(5);
  });

  it("何ヶ月も前の間隔は混ぜない", () => {
    // 7/01 を混ぜると平均が大きく狂う
    const dates = ["2026-07-01", "2026-09-20", "2026-09-30"];
    expect(feedingStats(dates, today).averageDays).toBe(10);
  });

  it("2回ぶん無ければ平均は出さない", () => {
    expect(feedingStats(["2026-09-30"], today).averageDays).toBeNull();
    expect(feedingStats([], today).averageDays).toBeNull();
  });
});
