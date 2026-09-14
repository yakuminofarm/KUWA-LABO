import { describe, expect, it } from "vitest";
import { certRows, certText } from "@/lib/pedigreeCert";
import { cardFileName } from "@/lib/share";
import { Beetle } from "@/types";

const beetle = (over: Partial<Beetle> = {}): Beetle => ({
  id: "b1",
  code: "26OK-A1",
  species: "オオクワガタ",
  gender: "male",
  acquiredDate: "2026-01-10",
  isAlive: true,
  notes: "",
  ...over,
});

describe("certRows", () => {
  it("入っている項目だけ並ぶ", () => {
    const labels = certRows(
      beetle({ locality: "山梨県韮崎", generation: "WF1", sizeMm: 84.5, emergedDate: "2025-07-01" })
    ).map((r) => r.label);
    expect(labels).toEqual(["種類", "産地・血統", "累代", "性別", "体長", "羽化日"]);
  });

  it("月までしか分からない羽化日は「ごろ」を付ける", () => {
    const row = certRows(
      beetle({ emergedDate: "2025-07-01", emergedDatePrecision: "month" })
    ).find((r) => r.label === "羽化日");
    expect(row?.value).toContain("ごろ");
  });

  // 血統書は人に渡すもの。金額が載っていては渡せない
  it("金額やメモはどこにも載せない", () => {
    const all = certRows(
      beetle({
        priceYen: 15000,
        soldPriceYen: 28000,
        soldTo: "○○昆虫店",
        notes: "ここは人に見せない覚書",
        locality: "山梨県韮崎",
      })
    )
      .map((r) => `${r.label}:${r.value}`)
      .join("|");
    expect(all).not.toMatch(/15000|28000|金額|価格|円/);
    expect(all).not.toContain("○○昆虫店");
    expect(all).not.toContain("覚書");
  });
});

describe("certText", () => {
  it("何の血統書か分かる文にする", () => {
    expect(certText(beetle({ locality: "山梨県韮崎", generation: "WF1" }))).toBe(
      "26OK-A1 / オオクワガタ / 山梨県韮崎 / WF1 の血統書"
    );
  });

  it("添える文にも金額は入れない", () => {
    expect(certText(beetle({ priceYen: 15000 }))).not.toContain("15000");
  });
});

describe("cardFileName", () => {
  it("種類を足した名前にできる", () => {
    expect(cardFileName("26OK-A1", "pedigree")).toBe("26OK-A1-pedigree.jpg");
  });

  it("管理番号が消えても種類は残す", () => {
    expect(cardFileName("???", "pedigree")).toBe("kuwa-pedigree.jpg");
  });
});
