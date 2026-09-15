import { describe, expect, it } from "vitest";
import { parseRecordQr, qrModuleCount, recordQrText } from "@/lib/qr";

describe("recordQrText / parseRecordQr", () => {
  it("入れて出すと元に戻る", () => {
    for (const kind of ["beetle", "larva"] as const) {
      expect(parseRecordQr(recordQrText(kind, "abc123xyz"))).toEqual({ kind, id: "abc123xyz" });
    }
  });

  it("成虫と幼虫を取り違えない", () => {
    expect(parseRecordQr(recordQrText("beetle", "x"))?.kind).toBe("beetle");
    expect(parseRecordQr(recordQrText("larva", "x"))?.kind).toBe("larva");
  });

  it("前後の空白は落とす (読み取りに混ざることがある)", () => {
    expect(parseRecordQr(` ${recordQrText("beetle", "x")}\n`)).toEqual({
      kind: "beetle",
      id: "x",
    });
  });

  // 商品のバーコードなど、よそのQRを読んでしまったとき。
  // それらしく振る舞うと、関係のない記録を開いてしまう
  it("くわらぼのQRでなければ何も返さない", () => {
    for (const text of [
      "",
      "https://example.com",
      "kuwalabo",
      "kuwalabo:b",
      "kuwalabo:b:",
      "kuwalabo:x:abc",
      "other:b:abc",
      "kuwalabo:b:abc:extra",
      "4901234567894",
    ]) {
      expect(parseRecordQr(text), text).toBeNull();
    }
  });
});

describe("qrModuleCount", () => {
  it("短い字なら目が粗い (刷っても読める大きさになる)", () => {
    // 記録のid は15文字ほど。まわりの余白を除いて33目までなら、
    // 20mm四角に刷って1目0.5mm以上を保てる
    const text = recordQrText("larva", "abcdefg1234567h");
    expect(qrModuleCount(text)).toBeLessThanOrEqual(33);
  });

  it("字が増えれば目は細かくなる", () => {
    const few = qrModuleCount(recordQrText("beetle", "a"));
    const many = qrModuleCount(recordQrText("beetle", "a".repeat(200)));
    expect(many).toBeGreaterThan(few);
  });
});
