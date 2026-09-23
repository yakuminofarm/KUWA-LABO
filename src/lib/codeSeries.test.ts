import { describe, expect, it } from "vitest";
import {
  checkSeriesName,
  codeFromParts,
  joinCode,
  knownSeries,
  nextNumberIn,
  freeNumbers,
  numberOptions,
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

describe("codeFromParts", () => {
  it("2つそろえば管理番号になる", () => {
    expect(codeFromParts("TD-", "1")).toBe("TD-1");
  });

  it("番号が空のあいだは、まだ管理番号になっていない", () => {
    // 「TD-」を管理番号にすると、系統と番号に分け直せず、
    // 開き直したときに系統の欄まで空に見える
    expect(codeFromParts("TD-", "")).toBe("");
    expect(codeFromParts("", "")).toBe("");
  });

  it("記号なしで番号だけの人も組み立てられる", () => {
    expect(codeFromParts("", "7")).toBe("7");
  });
});

describe("numberOptions", () => {
  it("すでに使われている番号は、選べない印を付けて残す", () => {
    // 抜いてしまうと「002, 007, 008…」と飛び飛びになり、
    // なぜその並びなのか分からない
    const opts = numberOptions("A-", [c("A-1"), c("A-2")]);
    expect(opts.slice(0, 3)).toEqual([
      { number: "1", taken: true },
      { number: "2", taken: true },
      { number: "3", taken: false },
    ]);
  });

  it("途中が抜けていれば、その番号も選べる", () => {
    // 2番の子を消したあと。番号を詰め直したい人もいる
    expect(freeNumbers("A-", [c("A-1"), c("A-3")])).toContain("2");
  });

  it("少ないうちは1〜50まで出す", () => {
    const opts = freeNumbers("A-", [c("A-5")]);
    expect(opts[0]).toBe("1");
    expect(opts).not.toContain("5");
    expect(opts[opts.length - 1]).toBe("50");
  });

  it("その系統がまだ無くても1〜50", () => {
    expect(freeNumbers("B-", [c("A-1")])).toHaveLength(50);
  });

  it("進んでいる系統では、いまの番号の先を20個ぶん出す", () => {
    const opts = freeNumbers("A-", [c("A-100")]);
    expect(opts[opts.length - 1]).toBe("120");
  });

  it("桁は、その系統の書き方に合わせる", () => {
    expect(freeNumbers("A-", [c("A-01")])[0]).toBe("02");
  });

  it("ほかの系統の番号には引きずられない", () => {
    expect(freeNumbers("A-", [c("A-1"), c("B-9")])).toContain("2");
  });

  it("直しに来た本人の番号は、埋まっていても選べる", () => {
    expect(freeNumbers("A-", [c("A-1"), c("A-2")], "2")).toContain("2");
    expect(freeNumbers("A-", [c("A-1"), c("A-2")], "2")).not.toContain("1");
  });

  it("桁の違う番号で直しに来ても、本人のぶんは消えない", () => {
    expect(freeNumbers("A-", [c("A-01")], "7")).toContain("7");
  });
});
