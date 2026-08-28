import { describe, expect, it } from "vitest";
import { dailyTrivia } from "@/lib/trivia";

describe("dailyTrivia", () => {
  it("6月4日は虫の日を優先して返す", () => {
    expect(dailyTrivia(new Date(2026, 5, 4))).toContain("虫の日");
  });

  it("それ以外の日は雑学プールから、日付で決まった1つを返す (同じ日は同じ結果)", () => {
    const d = new Date(2026, 6, 10);
    expect(dailyTrivia(d)).toBe(dailyTrivia(d));
    expect(dailyTrivia(d)).not.toContain("虫の日");
  });

  it("1年通せば複数の雑学が出る (固定にならない)", () => {
    const seen = new Set<string>();
    for (let day = 0; day < 365; day++) {
      seen.add(dailyTrivia(new Date(2026, 0, 1 + day)));
    }
    expect(seen.size).toBeGreaterThan(5);
  });

  it("空文字にはならない", () => {
    for (let month = 0; month < 12; month++) {
      expect(dailyTrivia(new Date(2026, month, 15)).length).toBeGreaterThan(0);
    }
  });
});
