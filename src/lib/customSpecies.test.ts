import { describe, expect, it } from "vitest";
import {
  SPECIES_NAME_MAX,
  allSpeciesOptions,
  checkSpeciesName,
  normalizeSpeciesName,
  speciesGroupsWith,
  speciesInUse,
  tuningTargets,
} from "@/lib/customSpecies";
import { SPECIES_GROUPS, SPECIES_OPTIONS } from "@/lib/breeding";

describe("normalizeSpeciesName", () => {
  it("前後の空白を落とす", () => {
    expect(normalizeSpeciesName("  ニジイロクワガタ  ")).toBe("ニジイロクワガタ");
  });

  it("間の空白は1つにまとめる", () => {
    expect(normalizeSpeciesName("ニジイロ   クワガタ")).toBe("ニジイロ クワガタ");
  });
});

describe("checkSpeciesName", () => {
  it("通れば、そろえたあとの名前を返す", () => {
    expect(checkSpeciesName(" タランドゥス ", [])).toEqual({ name: "タランドゥス" });
  });

  it("空は通さない", () => {
    expect(checkSpeciesName("   ", [])).toEqual({ issue: "empty" });
  });

  it("長すぎるものは通さない", () => {
    expect(checkSpeciesName("あ".repeat(SPECIES_NAME_MAX + 1), [])).toEqual({ issue: "too-long" });
    expect(checkSpeciesName("あ".repeat(SPECIES_NAME_MAX), [])).toEqual({
      name: "あ".repeat(SPECIES_NAME_MAX),
    });
  });

  // 同じ名前が2つあると、目安も組める相手も分かれてしまう
  it("組み込みと同じ名前は通さない", () => {
    expect(checkSpeciesName("オオクワガタ", [])).toEqual({ issue: "duplicate" });
  });

  it("すでに足してある名前は通さない", () => {
    expect(checkSpeciesName("タランドゥス", ["タランドゥス"])).toEqual({ issue: "duplicate" });
  });

  it("空白だけ違う名前も同じものとして弾く", () => {
    expect(checkSpeciesName(" オオクワガタ ", [])).toEqual({ issue: "duplicate" });
  });

  // 「その他」は選択肢の仕組みで使っている
  it("「その他」は名前に使えない", () => {
    expect(checkSpeciesName("その他", [])).toEqual({ issue: "duplicate" });
  });
});

describe("speciesGroupsWith", () => {
  it("足したものが無ければ、組み込みのまま", () => {
    expect(speciesGroupsWith([])).toBe(SPECIES_GROUPS);
  });

  it("足したぶんは最後のまとまりにする", () => {
    const groups = speciesGroupsWith(["タランドゥス"]);
    expect(groups).toHaveLength(SPECIES_GROUPS.length + 1);
    expect(groups[groups.length - 1]).toEqual({
      label: "自分で足した品種",
      species: ["タランドゥス"],
    });
  });

  it("組み込みの並びを書き換えない", () => {
    const before = JSON.stringify(SPECIES_GROUPS);
    speciesGroupsWith(["タランドゥス"]);
    expect(JSON.stringify(SPECIES_GROUPS)).toBe(before);
  });
});

describe("allSpeciesOptions", () => {
  it("組み込みと足したぶんを合わせる", () => {
    const all = allSpeciesOptions(["タランドゥス"]);
    expect(all).toContain("オオクワガタ");
    expect(all).toContain("その他");
    expect(all).toContain("タランドゥス");
    expect(all).toHaveLength(SPECIES_OPTIONS.length + 1);
  });
});

describe("tuningTargets", () => {
  it("手元にいるものと足したものを合わせる", () => {
    expect(tuningTargets(["オオクワガタ"], ["タランドゥス"])).toEqual([
      "オオクワガタ",
      "タランドゥス",
    ]);
  });

  it("重なっても1つにする", () => {
    expect(tuningTargets(["タランドゥス"], ["タランドゥス"])).toEqual(["タランドゥス"]);
  });

  // 記録が無くても並べる。迎える前に目安を決めておけるように
  it("記録が1件も無くても、足した品種は並ぶ", () => {
    expect(tuningTargets([], ["タランドゥス"])).toEqual(["タランドゥス"]);
  });
});

describe("speciesInUse", () => {
  it("その品種の記録があるか見る", () => {
    const records = [{ species: "オオクワガタ" }, { species: "コクワガタ" }];
    expect(speciesInUse("コクワガタ", records)).toBe(true);
    expect(speciesInUse("タランドゥス", records)).toBe(false);
    expect(speciesInUse("タランドゥス", [])).toBe(false);
  });
});
