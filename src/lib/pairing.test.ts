import { describe, expect, it } from "vitest";
import { bloodDistance, pairingCandidates, suggestLineName } from "@/lib/pairing";
import { Beetle, BreedingLine, Larva } from "@/types";

const beetle = (id: string, extra: Partial<Beetle> = {}): Beetle => ({
  id,
  code: id,
  species: "オオクワガタ",
  gender: "unknown",
  acquiredDate: "2026-01-01",
  isAlive: true,
  matured: true,
  notes: "",
  ...extra,
});

const line = (id: string, maleId?: string, femaleId?: string): BreedingLine => ({
  id,
  name: id,
  species: "オオクワガタ",
  status: "split_done",
  notes: "",
  maleId,
  femaleId,
});

const larva = (id: string, lineId: string, extra: Partial<Larva> = {}): Larva => ({
  id,
  code: id,
  lineId,
  species: "オオクワガタ",
  stage: "L3",
  gender: "unknown",
  bottleChanges: [],
  isAlive: true,
  notes: "",
  ...extra,
});

const male = (id: string, extra: Partial<Beetle> = {}) =>
  beetle(id, { gender: "male", ...extra });
const female = (id: string, extra: Partial<Beetle> = {}) =>
  beetle(id, { gender: "female", ...extra });

const codes = (list: { beetle: Beetle }[]) => list.map((c) => c.beetle.code);

describe("bloodDistance", () => {
  it("親子と兄妹は同じ濃さに置く", () => {
    const parent = beetle("p");
    const child = beetle("c");
    expect(bloodDistance({ kind: "parent-child", parent, child })).toBe(
      bloodDistance({ kind: "siblings" })
    );
  });

  it("片親が同じと祖父孫は、兄妹より遠い", () => {
    expect(bloodDistance({ kind: "half-siblings", shared: beetle("s") })).toBeGreaterThan(
      bloodDistance({ kind: "siblings" })
    );
  });

  it("繋がりが見つからない相手がいちばん遠い", () => {
    expect(bloodDistance({ kind: "unrelated" })).toBeGreaterThan(
      bloodDistance({ kind: "shared-ancestor", shared: [beetle("s")] })
    );
  });
});

describe("pairingCandidates", () => {
  it("反対の性別だけを候補にする", () => {
    const base = male("me");
    const beetles = [base, female("f1"), male("m2"), female("f2")];
    expect(codes(pairingCandidates(base, beetles, [], []))).toEqual(["f1", "f2"]);
  });

  it("別の種類は候補に入れない", () => {
    const base = male("me");
    const beetles = [base, female("同種"), female("別種", { species: "ヒラタクワガタ" })];
    expect(codes(pairingCandidates(base, beetles, [], []))).toEqual(["同種"]);
  });

  it("死んだ個体と売った個体は出さない", () => {
    const base = male("me");
    const beetles = [
      base,
      female("生きている"),
      female("死んだ", { isAlive: false }),
      female("売った", { soldPriceYen: 20000 }),
    ];
    expect(codes(pairingCandidates(base, beetles, [], []))).toEqual(["生きている"]);
  });

  it("性別が分からない個体からは候補を出せない", () => {
    const base = beetle("me");
    expect(pairingCandidates(base, [base, female("f1")], [], [])).toEqual([]);
  });

  it("後食していない相手は後ろに回し、印を付ける", () => {
    const base = male("me");
    const beetles = [base, female("まだ", { matured: false }), female("済み")];
    const out = pairingCandidates(base, beetles, [], []);
    expect(codes(out)).toEqual(["済み", "まだ"]);
    expect(out[0].ready).toBe(true);
    expect(out[1].cautions).toContain("not-matured");
  });

  it("血が近い相手は後ろに回し、印を付ける", () => {
    // 妹 (同じ親から採れた) と、繋がりの無いメス
    const dad = male("dad");
    const mom = female("mom");
    const l = line("L1", "dad", "mom");
    const base = male("me", { sourceLineId: "L1" });
    const sister = female("妹", { sourceLineId: "L1" });
    const other = female("よその子");
    const beetles = [dad, mom, base, sister, other];

    const out = pairingCandidates(base, beetles, [l], []);
    // 繋がりの無い相手が先。母 (親子) と妹 (兄妹) は同じ濃さなので後ろにまとまる
    expect(codes(out)[0]).toBe("よその子");
    expect(out[0].cautions).toEqual([]);
    expect(codes(out).slice(1).sort()).toEqual(["mom", "妹"]);
    for (const c of out.slice(1)) expect(c.cautions).toContain("close-blood");
    expect(out.find((c) => c.beetle.code === "妹")?.relation.kind).toBe("siblings");
    expect(out.find((c) => c.beetle.code === "mom")?.relation.kind).toBe("parent-child");
  });

  it("産地が違う相手は下げ、印を付ける", () => {
    const base = male("me", { locality: "能勢YG" });
    const beetles = [
      base,
      female("よそ産地", { locality: "久留米" }),
      female("同産地", { locality: "能勢YG" }),
    ];
    const out = pairingCandidates(base, beetles, [], []);
    expect(codes(out)).toEqual(["同産地", "よそ産地"]);
    expect(out[1].cautions).toContain("different-locality");
  });

  it("産地が片方でも空なら「違う」とは言わない", () => {
    const base = male("me", { locality: "能勢YG" });
    const beetles = [base, female("産地なし")];
    expect(pairingCandidates(base, beetles, [], [])[0].cautions).toEqual([]);
  });

  it("血の遠さが同じなら、種親としての成績が大きいほうを先に出す", () => {
    const base = male("me");
    const beetles = [base, female("実績あり"), female("実績なし")];
    const l = line("L1", "よその父", "実績あり");
    const out = pairingCandidates(base, beetles, [l], [
      larva("x", "L1", { emergedSizeMm: 83.4 }),
    ]);
    expect(codes(out)).toEqual(["実績あり", "実績なし"]);
    expect(out[0].bestOffspringMm).toBe(83.4);
    expect(out[1].bestOffspringMm).toBeUndefined();
  });

  it("成績も同じなら、体長の大きいほうを先に出す", () => {
    const base = male("me");
    const beetles = [base, female("小", { sizeMm: 48 }), female("大", { sizeMm: 53.5 })];
    expect(codes(pairingCandidates(base, beetles, [], []))).toEqual(["大", "小"]);
  });
});

describe("suggestLineName", () => {
  it("その年でまだ使っていない字を出す", () => {
    expect(suggestLineName([], 2026)).toBe("2026-A");
    expect(suggestLineName([line("x")], 2026)).toBe("2026-A");
  });

  it("使っている字は飛ばす", () => {
    const used = [
      { ...line("a"), name: "2026-A" },
      { ...line("b"), name: "2026-B" },
    ];
    expect(suggestLineName(used, 2026)).toBe("2026-C");
  });

  it("年が違えば同じ字をまた使える", () => {
    const used = [{ ...line("a"), name: "2025-A" }];
    expect(suggestLineName(used, 2026)).toBe("2026-A");
  });
});
