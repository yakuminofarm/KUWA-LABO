import { describe, expect, it } from "vitest";
import { activeLabels, countText, summaryLine } from "@/lib/listFilter";

const OPTIONS = [
  { key: "alive", label: "飼育中" },
  { key: "unfed", label: "エサまだ" },
  { key: "male", label: "♂ オス" },
] as const;

describe("activeLabels", () => {
  it("効いているものだけを返す", () => {
    expect(activeLabels(OPTIONS, new Set(["unfed"]))).toEqual(["エサまだ"]);
  });

  it("選んだ順ではなく、選択肢の並び順で返す", () => {
    // Set は入れた順を覚えているので、そのまま使うと押した順で文が変わる。
    // 同じ条件なら同じ文になってほしい
    expect(activeLabels(OPTIONS, new Set(["male", "alive"]))).toEqual(["飼育中", "♂ オス"]);
  });

  it("何も効いていなければ空", () => {
    expect(activeLabels(OPTIONS, new Set())).toEqual([]);
  });
});

describe("summaryLine", () => {
  it("条件が無いときは「すべて」", () => {
    expect(summaryLine([])).toBe("すべて");
  });

  it("条件を中黒でつなぐ", () => {
    expect(summaryLine(["飼育中", "エサまだ"])).toBe("飼育中 ・ エサまだ");
  });

  it("並べ方はスラッシュの右に置く", () => {
    expect(summaryLine(["飼育中"], ["新しい順"])).toBe("飼育中 / 新しい順");
  });

  it("条件が無くても並べ方は出す", () => {
    expect(summaryLine([], ["新しい順", "種類ごと"])).toBe("すべて / 新しい順 ・ 種類ごと");
  });
});

describe("countText", () => {
  it("単位を挟んで返す", () => {
    expect(countText(12, "頭")).toBe("12頭を表示中");
    expect(countText(0, "ライン")).toBe("0ラインを表示中");
  });
});
