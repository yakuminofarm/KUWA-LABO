import { describe, expect, it } from "vitest";
import { Beetle, BreedingLine, Larva } from "@/types";
import { checkup, normalizeForCompare } from "@/lib/checkup";

function beetle(o: Partial<Beetle> = {}): Beetle {
  return {
    id: "b1",
    code: "A-1",
    species: "オオクワガタ",
    gender: "male",
    acquiredDate: "2026-01-01",
    isAlive: true,
    notes: "",
    ...o,
  };
}
function larva(o: Partial<Larva> = {}): Larva {
  return {
    id: "l1",
    code: "2026-A-01",
    species: "オオクワガタ",
    stage: "L3",
    gender: "unknown",
    bottleChanges: [],
    isAlive: true,
    notes: "",
    ...o,
  };
}
const line = (o: Partial<BreedingLine> = {}): BreedingLine => ({
  id: "L1",
  name: "2026-A",
  species: "オオクワガタ",
  status: "pairing",
  notes: "",
  ...o,
});

describe("normalizeForCompare", () => {
  it("ハイフンの種類をそろえる", () => {
    expect(normalizeForCompare("TDー")).toBe(normalizeForCompare("TD-"));
  });

  it("全角の英数を半角にそろえる", () => {
    expect(normalizeForCompare("ＴＤ－")).toBe(normalizeForCompare("TD-"));
  });

  it("空白と中黒を落とす", () => {
    expect(normalizeForCompare("能勢 YG・血統")).toBe(normalizeForCompare("能勢YG血統"));
  });

  it("大文字小文字をそろえる", () => {
    expect(normalizeForCompare("td-")).toBe(normalizeForCompare("TD-"));
  });
});

describe("checkup", () => {
  it("何も問題が無ければ、何も出さない", () => {
    expect(checkup([beetle()], [larva()], [line()])).toEqual([]);
  });

  it("同じ管理番号の子を見つける", () => {
    const found = checkup(
      [beetle({ id: "a", code: "TD-1" }), beetle({ id: "b", code: "TD-1" })],
      [],
      []
    );
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe("duplicate-code");
    expect(found[0].values).toEqual(["TD-1"]);
    expect(found[0].count).toBe(2);
  });

  it("書き方が違うだけの品種を見つける", () => {
    const found = checkup(
      [beetle({ code: "A-1", species: "ニジイロクワガタ" })],
      [larva({ species: "ニジイロ クワガタ" })],
      []
    );
    expect(found.map((f) => f.kind)).toEqual(["species"]);
    expect(found[0].values.sort()).toEqual(["ニジイロ クワガタ", "ニジイロクワガタ"]);
  });

  it("片方がもう片方で始まる品種も見つける", () => {
    const found = checkup(
      [
        beetle({ id: "a", code: "A-1", species: "ニジイロ" }),
        beetle({ id: "b", code: "A-2", species: "ニジイロクワガタ" }),
      ],
      [],
      []
    );
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe("species");
  });

  it("管理系統の書き方のゆれを見つける", () => {
    const found = checkup(
      [beetle({ id: "a", code: "TD-1" }), beetle({ id: "b", code: "TDー2" })],
      [],
      []
    );
    expect(found.map((f) => f.kind)).toContain("series");
  });

  it("似ているだけの別の系統は出さない", () => {
    // 「TD-」と「TD-A」は、どちらも使っている別の系統かもしれない
    const found = checkup(
      [beetle({ id: "a", code: "TD-1" }), beetle({ id: "b", code: "TD-A1" })],
      [],
      []
    );
    expect(found.filter((f) => f.kind === "series")).toEqual([]);
  });

  it("産地のゆれは品種ごとに見る", () => {
    const found = checkup(
      [
        beetle({ id: "a", code: "A-1", locality: "能勢YG" }),
        beetle({ id: "b", code: "A-2", locality: "能勢YG血統" }),
        beetle({ id: "c", code: "A-3", species: "ヒラタクワガタ", locality: "能勢YG" }),
      ],
      [],
      []
    );
    const locality = found.filter((f) => f.kind === "locality");
    expect(locality).toHaveLength(1);
    expect(locality[0].where).toContain("オオクワガタ");
  });

  it("短すぎる頭は、たまたま合うだけなので出さない", () => {
    const found = checkup(
      [
        beetle({ id: "a", code: "A-1", locality: "山梨" }),
        beetle({ id: "b", code: "A-2", locality: "山梨県韮崎" }),
      ],
      [],
      []
    );
    expect(found.filter((f) => f.kind === "locality")).toEqual([]);
  });

  it("関わっている記録の数を数える", () => {
    const found = checkup(
      [
        beetle({ id: "a", code: "A-1", species: "ニジイロ" }),
        beetle({ id: "b", code: "A-2", species: "ニジイロクワガタ" }),
        beetle({ id: "c", code: "A-3", species: "ニジイロクワガタ" }),
      ],
      [],
      []
    );
    expect(found.filter((f) => f.kind === "species")[0].count).toBe(3);
  });
});
