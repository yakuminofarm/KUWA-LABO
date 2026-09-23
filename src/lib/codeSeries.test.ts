import { describe, expect, it } from "vitest";
import {
  checkSeriesName,
  joinCode,
  knownSeries,
  nextNumberIn,
  seriesInUse,
  splitCode,
} from "@/lib/codeSeries";

const c = (code: string) => ({ code });

describe("splitCode", () => {
  it("末尾の数字を番号として切り分ける", () => {
    expect(splitCode("25OK-A3")).toEqual({ series: "25OK-A", number: "3" });
  });

  it("桁はそのまま持つ (03 は 3 にしない)", () => {
    expect(splitCode("26NJ-03")).toEqual({ series: "26NJ-", number: "03" });
  });

  it("途中の数字は系統の一部として残す", () => {
    expect(splitCode("2026-A-01")).toEqual({ series: "2026-A-", number: "01" });
  });

  it("記号なしで番号だけの人も分けられる", () => {
    expect(splitCode("7")).toEqual({ series: "", number: "7" });
  });

  it("末尾が数字でなければ分けない", () => {
    expect(splitCode("オオクワ♂")).toBeNull();
    expect(splitCode("")).toBeNull();
  });
});

describe("joinCode", () => {
  it("分けたものを戻すと元に戻る", () => {
    for (const code of ["25OK-A3", "26NJ-03", "2026-A-01", "7"]) {
      const s = splitCode(code)!;
      expect(joinCode(s.series, s.number)).toBe(code);
    }
  });
});

describe("knownSeries", () => {
  it("新しく使ったものほど上に出す", () => {
    const list = [c("25OK-A1"), c("25PH-B1"), c("25OK-A2")];
    expect(knownSeries(list)).toEqual(["25OK-A", "25PH-B"]);
  });

  it("登録しただけで、まだ記録の無い系統は後ろに付ける", () => {
    expect(knownSeries([c("25OK-A1")], ["26OK-B"])).toEqual(["25OK-A", "26OK-B"]);
  });

  it("使っている系統は、登録一覧にあっても二重に出さない", () => {
    expect(knownSeries([c("25OK-A1")], ["25OK-A"])).toEqual(["25OK-A"]);
  });

  it("分けられない番号は系統として数えない", () => {
    expect(knownSeries([c("オオクワ♂")])).toEqual([]);
  });
});

describe("nextNumberIn", () => {
  it("その系統の続きを出す", () => {
    expect(nextNumberIn("25OK-A", [c("25OK-A1"), c("25OK-A2")])).toBe("3");
  });

  it("ほかの系統の番号には引きずられない", () => {
    expect(nextNumberIn("25OK-A", [c("25OK-A1"), c("25PH-B9")])).toBe("2");
  });

  it("桁を保つ", () => {
    expect(nextNumberIn("26NJ-", [c("26NJ-03")])).toBe("04");
  });

  it("埋まっている番号は飛ばす", () => {
    expect(nextNumberIn("25OK-A", [c("25OK-A1"), c("25OK-A2"), c("25OK-A3")])).toBe("4");
  });

  it("その系統がまだ無ければ1番から", () => {
    expect(nextNumberIn("26OK-B", [c("25OK-A1")])).toBe("1");
  });
});

describe("seriesInUse", () => {
  it("使っていれば true", () => {
    expect(seriesInUse("25OK-A", [c("25OK-A1")])).toBe(true);
    expect(seriesInUse("26OK-B", [c("25OK-A1")])).toBe(false);
  });
});

describe("checkSeriesName", () => {
  it("前後の空白は落とす", () => {
    expect(checkSeriesName(" 26OK-B ", [])).toEqual({ name: "26OK-B" });
  });

  it("空は弾く", () => {
    expect(checkSeriesName("  ", [])).toEqual({ issue: "empty" });
  });

  it("終わりが数字の系統は弾く (番号と見分けがつかない)", () => {
    // "25" + "3" は "253" になり、読み直すと系統なしの253番になる
    expect(checkSeriesName("25", [])).toEqual({ issue: "ends-with-digit" });
    expect(checkSeriesName("26OK1", [])).toEqual({ issue: "ends-with-digit" });
  });

  it("同じ名前は弾く", () => {
    expect(checkSeriesName("25OK-A", ["25OK-A"])).toEqual({ issue: "duplicate" });
  });

  it("長すぎる名前は弾く", () => {
    expect(checkSeriesName("あ".repeat(21), [])).toEqual({ issue: "too-long" });
  });
});
