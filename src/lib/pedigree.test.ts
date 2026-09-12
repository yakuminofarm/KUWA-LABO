import { describe, expect, it } from "vitest";
import { PEDIGREE_DEPTH, ancestorCount, hasParents, pedigreeOf } from "@/lib/pedigree";
import { Beetle, BreedingLine } from "@/types";

const beetle = (id: string, extra: Partial<Beetle> = {}): Beetle => ({
  id,
  code: id,
  species: "オオクワガタ",
  gender: "unknown",
  acquiredDate: "2026-01-01",
  isAlive: true,
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

describe("pedigreeOf", () => {
  it("出身ラインが無ければ、そこで家系が途切れる (買ってきた個体)", () => {
    const me = beetle("me");
    const p = pedigreeOf(me, [me], []);
    expect(hasParents(p)).toBe(false);
    expect(ancestorCount(p)).toBe(0);
  });

  it("出身ラインの♂♀を親として出す", () => {
    const dad = beetle("dad", { gender: "male" });
    const mom = beetle("mom", { gender: "female" });
    const me = beetle("me", { sourceLineId: "L1" });

    const p = pedigreeOf(me, [me, dad, mom], [line("L1", "dad", "mom")]);

    expect(p.father?.beetle.id).toBe("dad");
    expect(p.mother?.beetle.id).toBe("mom");
    expect(p.line?.name).toBe("L1");
  });

  it("片方しか記録が無くても、分かるほうだけ出す", () => {
    const mom = beetle("mom");
    const me = beetle("me", { sourceLineId: "L1" });

    const p = pedigreeOf(me, [me, mom], [line("L1", undefined, "mom")]);

    expect(p.father).toBeUndefined();
    expect(p.mother?.beetle.id).toBe("mom");
    expect(hasParents(p)).toBe(true);
  });

  it("親が手元から消えていれば、その枝は出さない", () => {
    const me = beetle("me", { sourceLineId: "L1" });
    const p = pedigreeOf(me, [me], [line("L1", "いない", "も いない")]);
    expect(hasParents(p)).toBe(false);
  });

  it("祖父母までたどる", () => {
    const gf = beetle("gf");
    const gm = beetle("gm");
    const dad = beetle("dad", { sourceLineId: "L0" });
    const mom = beetle("mom");
    const me = beetle("me", { sourceLineId: "L1" });

    const p = pedigreeOf(
      me,
      [me, dad, mom, gf, gm],
      [line("L1", "dad", "mom"), line("L0", "gf", "gm")]
    );

    expect(p.father?.father?.beetle.id).toBe("gf");
    expect(p.father?.mother?.beetle.id).toBe("gm");
    expect(ancestorCount(p)).toBe(4);
  });

  it("決めた世代より先はたどらない", () => {
    const gf = beetle("gf");
    const dad = beetle("dad", { sourceLineId: "L0" });
    const me = beetle("me", { sourceLineId: "L1" });

    const shallow = pedigreeOf(me, [me, dad, gf], [line("L1", "dad"), line("L0", "gf")], 2);

    expect(shallow.father?.beetle.id).toBe("dad");
    // 2世代ぶんなので祖父は出ない
    expect(shallow.father?.father).toBeUndefined();
  });

  it("父方と母方に同じ祖先が出ても、両方に出す (兄妹掛けは普通のこと)", () => {
    const gf = beetle("gf");
    const gm = beetle("gm");
    // 兄と妹。どちらも同じ親から採れている
    const bro = beetle("bro", { sourceLineId: "L0" });
    const sis = beetle("sis", { sourceLineId: "L0" });
    const me = beetle("me", { sourceLineId: "L1" });

    const p = pedigreeOf(
      me,
      [me, bro, sis, gf, gm],
      [line("L1", "bro", "sis"), line("L0", "gf", "gm")],
      4
    );

    expect(p.father?.father?.beetle.id).toBe("gf");
    expect(p.mother?.father?.beetle.id).toBe("gf");
    // 同じ個体は1頭として数える
    expect(ancestorCount(p)).toBe(4);
  });

  it("記録が輪になっていても止まる (自分の子を親に指してある)", () => {
    // me の親が child、child の親が me という壊れ方
    const child = beetle("child", { sourceLineId: "L1" });
    const me = beetle("me", { sourceLineId: "L2" });

    const p = pedigreeOf(me, [me, child], [line("L2", "child"), line("L1", "me")], 99);

    expect(p.father?.beetle.id).toBe("child");
    // 自分へ戻ってこない
    expect(p.father?.father).toBeUndefined();
  });

  it("既定では3世代 (本人・親・祖父母) までたどる", () => {
    expect(PEDIGREE_DEPTH).toBe(3);

    const ggf = beetle("ggf");
    const gf = beetle("gf", { sourceLineId: "L-1" });
    const dad = beetle("dad", { sourceLineId: "L0" });
    const me = beetle("me", { sourceLineId: "L1" });

    const p = pedigreeOf(
      me,
      [me, dad, gf, ggf],
      [line("L1", "dad"), line("L0", "gf"), line("L-1", "ggf")]
    );

    expect(p.father?.father?.beetle.id).toBe("gf");
    expect(p.father?.father?.father).toBeUndefined();
  });
});
