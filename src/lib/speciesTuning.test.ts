import { describe, expect, it } from "vitest";
import {
  HUSBANDRY_GROUPS,
  aiTuning,
  husbandryOf,
  scheduleFor,
  sourceOf,
  tuningFor,
} from "@/lib/speciesTuning";
import { SPECIES_OPTIONS } from "@/lib/breeding";
import { ScheduleSettings } from "@/types";

const schedule: ScheduleSettings = {
  pupaDaysMin: 28,
  pupaDaysMax: 56,
  digOutDays: 30,
  bottleChangeDays: 90,
};

describe("分類の表", () => {
  it("同じ品種を2つの分類に入れていない", () => {
    const seen = new Set<string>();
    for (const g of HUSBANDRY_GROUPS) {
      for (const s of g.species) {
        expect(seen.has(s), `${s} が重複している`).toBe(false);
        seen.add(s);
      }
    }
  });

  it("知らない品種を書いていない (選べる品種の中だけ)", () => {
    const known = new Set(SPECIES_OPTIONS);
    for (const g of HUSBANDRY_GROUPS) {
      for (const s of g.species) {
        expect(known.has(s), `${s} は選べる品種に無い`).toBe(true);
      }
    }
  });

  it("蛹の日数は 最短 <= 最長 になっている", () => {
    for (const g of HUSBANDRY_GROUPS) {
      const { pupaDaysMin, pupaDaysMax } = g.values;
      if (pupaDaysMin != null && pupaDaysMax != null) {
        expect(pupaDaysMin, g.label).toBeLessThanOrEqual(pupaDaysMax);
      }
    }
  });

  it("どの値も1日以上", () => {
    for (const g of HUSBANDRY_GROUPS) {
      for (const [key, v] of Object.entries(g.values)) {
        expect(v, `${g.label} の ${key}`).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe("husbandryOf / aiTuning", () => {
  it("知っている品種は分類が引ける", () => {
    expect(husbandryOf("オオクワガタ")?.label).toBe("オオクワ系");
    expect(husbandryOf("ニジイロクワガタ")?.label).toBe("ニジイロ・キンイロ");
  });

  it("「その他」や自由入力には目安を持たない", () => {
    expect(husbandryOf("その他")).toBeUndefined();
    expect(husbandryOf("よく分からないクワガタ")).toBeUndefined();
    expect(aiTuning("その他")).toEqual({});
  });
});

describe("tuningFor (効かせる順番)", () => {
  it("目安が無い品種は、全体設定がそのまま出る", () => {
    const t = tuningFor("その他", schedule, 1);
    expect(t).toEqual({ ...schedule, feedIntervalDays: 1 });
  });

  it("目安がある品種は、AIの値が全体設定より優先される", () => {
    const t = tuningFor("コクワガタ", schedule, 1);
    expect(t.feedIntervalDays).toBe(4);
    expect(t.digOutDays).toBe(25);
  });

  it("本人が直した値は、AIの目安より優先される", () => {
    const t = tuningFor("コクワガタ", schedule, 1, { コクワガタ: { feedIntervalDays: 7 } });
    expect(t.feedIntervalDays).toBe(7);
    // 直していない項目はAIの目安のまま
    expect(t.digOutDays).toBe(25);
  });

  it("別の品種の設定に引きずられない", () => {
    const t = tuningFor("オオクワガタ", schedule, 1, { コクワガタ: { feedIntervalDays: 7 } });
    expect(t.feedIntervalDays).toBe(3);
  });

  it("0 は「未設定」ではなく値として扱う", () => {
    const t = tuningFor("コクワガタ", schedule, 1, { コクワガタ: { digOutDays: 0 } });
    expect(t.digOutDays).toBe(0);
  });
});

describe("sourceOf (出どころ)", () => {
  it("本人が直していれば user", () => {
    expect(sourceOf("コクワガタ", "feedIntervalDays", { コクワガタ: { feedIntervalDays: 7 } })).toBe(
      "user"
    );
  });

  it("AIの目安があれば ai", () => {
    expect(sourceOf("コクワガタ", "feedIntervalDays")).toBe("ai");
  });

  it("どちらも無ければ global", () => {
    expect(sourceOf("その他", "feedIntervalDays")).toBe("global");
  });
});

describe("scheduleFor", () => {
  it("育成の目安だけ取り出す", () => {
    expect(scheduleFor("コクワガタ", schedule)).toEqual({
      pupaDaysMin: 18,
      pupaDaysMax: 35,
      digOutDays: 25,
      bottleChangeDays: 120,
    });
  });

  it("目安の無い品種は全体設定のまま", () => {
    expect(scheduleFor("その他", schedule)).toEqual(schedule);
  });
});
