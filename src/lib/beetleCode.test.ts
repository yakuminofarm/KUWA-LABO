import { describe, expect, it } from "vitest";
import { nextCode, suggestCode } from "@/lib/beetleCode";

const b = (code: string, species = "オオクワガタ") => ({ code, species });

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

describe("suggestCode", () => {
  it("同じ品種で最後に登録した番号の続きを出す", () => {
    expect(suggestCode([b("25OK-A1"), b("25OK-A2")], "オオクワガタ")).toBe("25OK-A3");
  });

  it("品種ごとに番号を分けている人に、別の品種の続きを出さない", () => {
    const list = [b("25OK-A1"), b("25PH-B1", "パラワンオオヒラタ")];
    expect(suggestCode(list, "オオクワガタ")).toBe("25OK-A2");
    expect(suggestCode(list, "パラワンオオヒラタ")).toBe("25PH-B2");
  });

  it("その品種が1頭もいなければ下書きしない (勝手に別の記号を当てない)", () => {
    expect(suggestCode([b("25OK-A1")], "ニジイロクワガタ")).toBe("");
  });

  it("1頭もいなければ下書きしない", () => {
    expect(suggestCode([], "オオクワガタ")).toBe("");
  });

  it("通しで振っている人は、品種が違っても空いている番号まで進む", () => {
    // No.1〜No.3 が埋まっていて、最後の「ニジイロ」は No.2
    const list = [b("No.1"), b("No.2", "ニジイロクワガタ"), b("No.3")];
    expect(suggestCode(list, "ニジイロクワガタ")).toBe("No.4");
  });

  it("番号に数字が無い人には下書きしない", () => {
    expect(suggestCode([b("オオクワ♂")], "オオクワガタ")).toBe("");
  });
});
