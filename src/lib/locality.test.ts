import { describe, expect, it } from "vitest";
import { knownLocalities } from "@/lib/locality";

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
