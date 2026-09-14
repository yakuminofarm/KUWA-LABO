import { describe, expect, it } from "vitest";
import { cardRows, shareText } from "@/lib/shareCard";
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

describe("cardRows", () => {
  it("種類は必ず載る", () => {
    const rows = cardRows(beetle());
    expect(rows[0]).toEqual({ label: "種類", value: "オオクワガタ" });
  });

  it("空の項目は行そのものを作らない", () => {
    const labels = cardRows(beetle({ gender: "unknown" })).map((r) => r.label);
    expect(labels).toEqual(["種類"]);
  });

  it("入っている項目だけ順番に並ぶ", () => {
    const labels = cardRows(
      beetle({
        locality: "山梨県韮崎",
        generation: "WF1",
        sizeMm: 84.5,
        emergedDate: "2025-07-01",
      })
    ).map((r) => r.label);
    expect(labels).toEqual(["種類", "産地・血統", "累代", "性別", "体長", "羽化日"]);
  });

  it("性別は分かっているときだけ出す", () => {
    expect(cardRows(beetle({ gender: "female" }))).toContainEqual({
      label: "性別",
      value: "♀ メス",
    });
    expect(cardRows(beetle({ gender: "unknown" })).map((r) => r.label)).not.toContain("性別");
  });

  // 入手金額と販売価格は人に見せるものではない。この試験は方針の見張り
  it("金額はどこにも載せない", () => {
    const rows = cardRows(
      beetle({
        priceYen: 15000,
        soldPriceYen: 28000,
        soldTo: "○○昆虫店",
        notes: "ここは人に見せない覚書",
        locality: "パラワン島",
        generation: "WF1",
        sizeMm: 103.2,
        emergedDate: "2025-08-10",
      })
    );
    const all = rows.map((r) => `${r.label}:${r.value}`).join("|");
    expect(all).not.toMatch(/15000|28000|金額|価格|円/);
    expect(all).not.toContain("○○昆虫店");
    expect(all).not.toContain("覚書");
  });
});

describe("shareText", () => {
  it("要点を並べる", () => {
    expect(
      shareText(beetle({ locality: "山梨県韮崎", generation: "WF1", sizeMm: 84.5 }))
    ).toBe("26OK-A1 / オオクワガタ / 山梨県韮崎 / WF1 / 84.5mm");
  });

  it("空の項目は詰める", () => {
    expect(shareText(beetle())).toBe("26OK-A1 / オオクワガタ");
  });

  it("添える文にも金額は入れない", () => {
    expect(shareText(beetle({ priceYen: 15000, soldPriceYen: 28000 }))).not.toMatch(
      /15000|28000/
    );
  });
});

describe("cardFileName", () => {
  it("管理番号をそのまま使う", () => {
    expect(cardFileName("26OK-A1")).toBe("26OK-A1.jpg");
  });

  it("ファイル名に使えない記号は削る", () => {
    expect(cardFileName("26/OK A1#①")).toBe("26OKA1.jpg");
  });

  it("削って何も残らなければ既定の名前にする", () => {
    expect(cardFileName("???")).toBe("kuwa.jpg");
    expect(cardFileName("")).toBe("kuwa.jpg");
  });
});
