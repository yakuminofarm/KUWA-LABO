import { describe, expect, it } from "vitest";
import { Beetle } from "@/types";
import { duplicateBeetleForm, nextCode } from "@/components/BeetleFields";

function beetle(overrides: Partial<Beetle> = {}): Beetle {
  return {
    id: "b1",
    code: "26OK-A1",
    species: "オオクワガタ",
    gender: "male",
    acquiredDate: "2026-01-01",
    isAlive: true,
    notes: "",
    ...overrides,
  };
}

describe("nextCode", () => {
  it("末尾の数字を1つ進める", () => {
    expect(nextCode("26OK-A1", [])).toBe("26OK-A2");
  });

  it("桁を保つ (01 → 02)", () => {
    expect(nextCode("26OK-A01", [])).toBe("26OK-A02");
  });

  it("すでにある番号は飛ばす", () => {
    expect(nextCode("26OK-A1", ["26OK-A2", "26OK-A3"])).toBe("26OK-A4");
  });

  it("末尾に数字が無ければ自動採番できない (空欄にして手入力にゆだねる)", () => {
    expect(nextCode("オオクワガタ号", [])).toBe("");
  });
});

describe("duplicateBeetleForm (個体の複製)", () => {
  it("入手金額は引き継がない (複製した頭数ぶん総支出が膨らむのを防ぐ)", () => {
    const form = duplicateBeetleForm(
      beetle({ priceYen: 3000 }),
      ["オオクワガタ"],
      ["26OK-A1"]
    );
    expect(form.priceYen).toBe("");
  });

  it("血統にかかわる情報 (種類・産地・累代) は引き継ぐ", () => {
    const form = duplicateBeetleForm(
      beetle({ locality: "久留米", generation: "CBF1" }),
      ["オオクワガタ"],
      ["26OK-A1"]
    );
    expect(form.species).toBe("オオクワガタ");
    expect(form.locality).toBe("久留米");
    expect(form.generation).toBe("CBF1");
  });

  it("その個体だけのもの (愛称・体長) は引き継がない", () => {
    const form = duplicateBeetleForm(
      beetle({ name: "長男", sizeMm: 78.5 }),
      ["オオクワガタ"],
      ["26OK-A1"]
    );
    expect(form.name).toBe("");
    expect(form.sizeMm).toBe("");
  });

  it("管理番号は既存と重ならない次の番号になる", () => {
    const form = duplicateBeetleForm(
      beetle(),
      ["オオクワガタ"],
      ["26OK-A1", "26OK-A2"]
    );
    expect(form.code).toBe("26OK-A3");
  });
});
