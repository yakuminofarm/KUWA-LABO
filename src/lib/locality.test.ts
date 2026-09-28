import { describe, expect, it } from "vitest";
import { checkLocalityName, knownLocalities, localityUses } from "@/lib/locality";

const b = (locality: string | undefined, species = "オオクワガタ") => ({ locality, species });

describe("knownLocalities", () => {
  it("その品種で使った産地を出す", () => {
    expect(knownLocalities([b("久留米"), b("能勢YG血統")], "オオクワガタ")).toEqual([
      "能勢YG血統",
      "久留米",
    ]);
  });

  it("新しく使ったものほど前に出す", () => {
    const list = [b("久留米"), b("能勢YG血統"), b("久留米")];
    expect(knownLocalities(list, "オオクワガタ")).toEqual(["久留米", "能勢YG血統"]);
  });

  it("ほかの品種の産地は混ぜない", () => {
    // オオクワガタに「パラワン島」が出てきては困る
    const list = [b("久留米"), b("パラワン島", "パラワンオオヒラタ")];
    expect(knownLocalities(list, "オオクワガタ")).toEqual(["久留米"]);
  });

  it("空の産地は数えない", () => {
    expect(knownLocalities([b(undefined), b("  "), b("久留米")], "オオクワガタ")).toEqual([
      "久留米",
    ]);
  });

  it("前後の空白はそろえて、同じものにする", () => {
    expect(knownLocalities([b("久留米"), b(" 久留米 ")], "オオクワガタ")).toEqual(["久留米"]);
  });

  it("出す数をしぼれる", () => {
    const list = ["A", "B", "C", "D"].map((x) => b(x));
    expect(knownLocalities(list, "オオクワガタ", 2)).toEqual(["D", "C"]);
  });

  it("使ったことがなければ空", () => {
    expect(knownLocalities([], "オオクワガタ")).toEqual([]);
  });
});

describe("localityUses", () => {
  const rec = (species: string, locality?: string) => ({ species, locality });

  it("品種ごとにまとめて、頭数を数える", () => {
    const list = [
      rec("オオクワガタ", "久留米"),
      rec("オオクワガタ", "久留米"),
      rec("オオクワガタ", "能勢YG血統"),
    ];
    expect(localityUses(list)).toEqual([
      { species: "オオクワガタ", name: "久留米", count: 2 },
      { species: "オオクワガタ", name: "能勢YG血統", count: 1 },
    ]);
  });

  it("同じ産地名でも、品種が違えば別に数える", () => {
    // 同じ「久留米」でも品種が違えば別の血統で、片方だけ直したいことがある
    const list = [rec("オオクワガタ", "久留米"), rec("ヒラタクワガタ", "久留米")];
    expect(localityUses(list)).toHaveLength(2);
  });

  it("空の産地は数えない", () => {
    expect(localityUses([rec("オオクワガタ"), rec("オオクワガタ", "  ")])).toEqual([]);
  });
});

describe("checkLocalityName", () => {
  it("前後の空白を落とし、間の空白はまとめる", () => {
    expect(checkLocalityName("久留米", " 能勢  YG血統 ")).toEqual({ name: "能勢 YG血統" });
  });

  it("空は弾く", () => {
    expect(checkLocalityName("久留米", "   ")).toEqual({ issue: "empty" });
  });

  it("同じ名前は直したことにならない", () => {
    expect(checkLocalityName("久留米", "久留米")).toEqual({ issue: "same" });
  });

  it("すでにある産地へまとめるのは許す", () => {
    // 「能勢YG」を「能勢YG血統」にそろえたい、が実際に起きる
    expect(checkLocalityName("能勢YG", "能勢YG血統")).toEqual({ name: "能勢YG血統" });
  });
});
