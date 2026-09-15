import { describe, expect, it } from "vitest";
import { resolveScan } from "@/lib/scan";
import { recordQrText } from "@/lib/qr";
import { Beetle, Larva } from "@/types";

const beetle = (id: string): Beetle => ({
  id,
  code: id,
  species: "オオクワガタ",
  gender: "male",
  acquiredDate: "2026-01-01",
  isAlive: true,
  notes: "",
});

const larva = (id: string): Larva => ({
  id,
  code: id,
  species: "オオクワガタ",
  stage: "L3",
  gender: "unknown",
  bottleChanges: [],
  isAlive: true,
  notes: "",
});

const beetles = [beetle("b1"), beetle("b2")];
const larvae = [larva("v1")];

describe("resolveScan", () => {
  it("成虫のラベルからその成虫を引く", () => {
    expect(resolveScan(recordQrText("beetle", "b2"), beetles, larvae)).toEqual({
      kind: "beetle",
      id: "b2",
    });
  });

  it("幼虫のラベルからその幼虫を引く", () => {
    expect(resolveScan(recordQrText("larva", "v1"), beetles, larvae)).toEqual({
      kind: "larva",
      id: "v1",
    });
  });

  // 同じidが成虫と幼虫にあることは無いが、札の種類を無視して
  // 両方を探すと取り違える
  it("札の種類どおりに探す (成虫の札で幼虫を開かない)", () => {
    expect(resolveScan(recordQrText("beetle", "v1"), beetles, larvae)).toEqual({
      kind: "not-found",
    });
    expect(resolveScan(recordQrText("larva", "b1"), beetles, larvae)).toEqual({
      kind: "not-found",
    });
  });

  it("よそのQRは、それと分かるように返す", () => {
    for (const text of ["https://example.com", "4901234567894", "", "kuwalabo:x:b1"]) {
      expect(resolveScan(text, beetles, larvae), text).toEqual({ kind: "not-ours" });
    }
  });

  // 「よそのQR」と「消された記録」は言うべきことが違う
  it("くわらぼの札だが記録が無いときは、よそのQRと区別する", () => {
    expect(resolveScan(recordQrText("beetle", "消した子"), beetles, larvae)).toEqual({
      kind: "not-found",
    });
  });

  it("記録が何も無くても落ちない", () => {
    expect(resolveScan(recordQrText("beetle", "b1"), [], [])).toEqual({ kind: "not-found" });
  });
});
