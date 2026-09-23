import { describe, expect, it } from "vitest";
import {
  SPECIES_NAME_MAX,
  allSpeciesOptions,
  checkRename,
  checkSpeciesName,
  extraSpecies,
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

describe("extraSpecies (記録で使っている品種も選べるようにする)", () => {
  it("「その他」で打った品種を拾う", () => {
    expect(extraSpecies([], ["タウルスヒラタクワガタ", "オオクワガタ"])).toEqual([
      "タウルスヒラタクワガタ",
    ]);
  });

  it("組み込みの品種は足さない (二重に並ぶので)", () => {
    expect(extraSpecies([], ["オオクワガタ", "ニジイロクワガタ"])).toEqual([]);
  });

  it("自分で足した品種と混ぜて、重なりを落とす", () => {
    expect(extraSpecies(["タランドゥス"], ["タランドゥス", "タウルス"])).toEqual([
      "タウルス",
      "タランドゥス",
    ]);
  });

  it("空白のゆれはそろえる", () => {
    expect(extraSpecies([], [" タウルス ", "タウルス"])).toEqual(["タウルス"]);
  });

  it("空の品種は拾わない", () => {
    expect(extraSpecies([], ["", "  "])).toEqual([]);
  });
});

describe("checkRename (品種の名前を直す)", () => {
  it("そろえた名前を返す", () => {
    expect(checkRename("タウルス", " タウルスヒラタ ", ["タウルス"], ["タウルス"])).toEqual({
      name: "タウルスヒラタ",
      merging: false,
    });
  });

  it("組み込みの品種は直せない", () => {
    expect(checkRename("オオクワガタ", "オオクワ", [], [])).toEqual({ issue: "built-in" });
  });

  it("同じ名前は直したことにならない", () => {
    expect(checkRename("タウルス", "タウルス", ["タウルス"], [])).toEqual({ issue: "same" });
  });

  it("空や長すぎる名前は弾く", () => {
    expect(checkRename("タウルス", "  ", ["タウルス"], [])).toEqual({ issue: "empty" });
    expect(checkRename("タウルス", "あ".repeat(31), ["タウルス"], [])).toEqual({
      issue: "too-long",
    });
  });

  it("すでにある名前へ直すときは、まとめると分かるようにする", () => {
    // 「ニジイロ」を「ニジイロクワガタ」に直したい、が実際に起きる
    expect(checkRename("ニジイロ", "ニジイロクワガタ", ["ニジイロ"], [])).toEqual({
      name: "ニジイロクワガタ",
      merging: true,
    });
  });
});

describe("組み込みの名前が紛れ込んでも二重に出さない", () => {
  it("足した品種の中に組み込みがあっても落とす", () => {
    expect(extraSpecies(["オオクワガタ", "タウルス"], [])).toEqual(["タウルス"]);
  });
});
