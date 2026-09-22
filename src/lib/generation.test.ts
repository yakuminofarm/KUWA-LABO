import { describe, expect, it } from "vitest";
import { formatGeneration, generationNumbers, parseGeneration } from "@/lib/generation";

/** 選び直さないかぎり、記録の文字が変わらないこと */
const roundTrip = (raw: string) => formatGeneration(parseGeneration(raw));

describe("parseGeneration", () => {
  it("空なら不明", () => {
    expect(parseGeneration("")).toEqual({ kind: "unknown" });
    expect(parseGeneration(undefined)).toEqual({ kind: "unknown" });
    expect(parseGeneration("   ")).toEqual({ kind: "unknown" });
  });

  it("WD を読む", () => {
    expect(parseGeneration("WD")).toEqual({ kind: "wd" });
    expect(parseGeneration(" wd ")).toEqual({ kind: "wd" });
    expect(parseGeneration("WILD")).toEqual({ kind: "wd" });
  });

  it("WF・CBF・F を代数つきで読む", () => {
    expect(parseGeneration("WF1")).toEqual({ kind: "wf", n: 1 });
    expect(parseGeneration("CBF2")).toEqual({ kind: "cb", n: 2 });
    expect(parseGeneration("F5")).toEqual({ kind: "f", n: 5 });
  });

  it("CB + 数字も累代として読む (CB2 と書く人がいる)", () => {
    expect(parseGeneration("CB2")).toEqual({ kind: "cb", n: 2 });
  });

  it("大文字小文字と空白はそろえる", () => {
    expect(parseGeneration("cbf2")).toEqual({ kind: "cb", n: 2 });
    expect(parseGeneration("CB F2")).toEqual({ kind: "cb", n: 2 });
  });

  it("代数の無い CB も読む (お店のラベルで使われる書き方)", () => {
    expect(parseGeneration("CB")).toEqual({ kind: "cb" });
  });

  it("読めない書き方は、打たれたまま残す", () => {
    expect(parseGeneration("F2 (自己ブリード)")).toEqual({
      kind: "free",
      text: "F2 (自己ブリード)",
    });
    expect(parseGeneration("不明")).toEqual({ kind: "free", text: "不明" });
  });

  it("F0 のような代数は型に当てはめない", () => {
    expect(parseGeneration("F0")).toEqual({ kind: "free", text: "F0" });
  });
});

describe("formatGeneration", () => {
  it("CB は CBF に揃えて書き出す", () => {
    expect(formatGeneration({ kind: "cb", n: 2 })).toBe("CBF2");
  });

  it("代数が無ければ、代数を書かない (CB は CBF1 と別もの)", () => {
    expect(formatGeneration({ kind: "cb" })).toBe("CB");
    expect(formatGeneration({ kind: "cb", n: 1 })).toBe("CBF1");
  });

  it("不明は空にする (ラベルや血統書に「不明」と刷られないように)", () => {
    expect(formatGeneration({ kind: "unknown" })).toBe("");
  });
});

describe("読んで書き戻しても変わらない", () => {
  it.each(["", "WD", "WF1", "CBF2", "F5", "F2 (自己ブリード)", "CB"])("%s", (raw) => {
    expect(roundTrip(raw)).toBe(raw);
  });

  it("書き方のゆれだけは、そろえた形になる", () => {
    expect(roundTrip("cbf2")).toBe("CBF2");
    expect(roundTrip("CB2")).toBe("CBF2");
    expect(roundTrip(" wd ")).toBe("WD");
  });
});

describe("generationNumbers", () => {
  it("既定は1〜20", () => {
    expect(generationNumbers()).toHaveLength(20);
    expect(generationNumbers()[0]).toBe(1);
  });

  it("いまの値がそれより大きければ、そこまで出す", () => {
    expect(generationNumbers(25)).toHaveLength(25);
  });
});

describe("CB と CBF1 は別もの", () => {
  it("どちらも、開いて閉じただけでは入れ替わらない", () => {
    // お店のラベルが「CB」なら CB のまま、「CBF1」なら CBF1 のまま残す
    expect(roundTrip("CB")).toBe("CB");
    expect(roundTrip("CBF1")).toBe("CBF1");
  });
});
