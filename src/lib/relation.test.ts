import { describe, expect, it } from "vitest";
import { isClose, relationOf } from "@/lib/relation";
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

describe("relationOf", () => {
  it("同じ個体", () => {
    const a = beetle("a");
    expect(relationOf(a, a, [a], []).kind).toBe("same");
  });

  it("買ってきた個体どうしは、記録の範囲では繋がらない", () => {
    const a = beetle("a");
    const b = beetle("b");
    expect(relationOf(a, b, [a, b], []).kind).toBe("unrelated");
  });

  it("親と子", () => {
    const dad = beetle("dad");
    const mom = beetle("mom");
    const kid = beetle("kid", { sourceLineId: "L1" });
    const all = [dad, mom, kid];
    const lines = [line("L1", "dad", "mom")];

    const r = relationOf(dad, kid, all, lines);
    expect(r.kind).toBe("parent-child");
    if (r.kind === "parent-child") {
      expect(r.parent.id).toBe("dad");
      expect(r.child.id).toBe("kid");
    }
    // 順番を入れ替えても同じ間柄と分かる
    expect(relationOf(kid, mom, all, lines).kind).toBe("parent-child");
  });

  it("同じラインから採れた2頭は兄妹", () => {
    const dad = beetle("dad");
    const mom = beetle("mom");
    const bro = beetle("bro", { sourceLineId: "L1" });
    const sis = beetle("sis", { sourceLineId: "L1" });

    expect(relationOf(bro, sis, [dad, mom, bro, sis], [line("L1", "dad", "mom")]).kind).toBe(
      "siblings"
    );
  });

  it("同じペアを組み直した別ラインでも兄妹と分かる", () => {
    const dad = beetle("dad");
    const mom = beetle("mom");
    // 春と秋で組み直した。ラインは別だが親は同じ
    const spring = beetle("spring", { sourceLineId: "L1" });
    const autumn = beetle("autumn", { sourceLineId: "L2" });

    const r = relationOf(
      spring,
      autumn,
      [dad, mom, spring, autumn],
      [line("L1", "dad", "mom"), line("L2", "dad", "mom")]
    );
    expect(r.kind).toBe("siblings");
  });

  it("片親だけ同じなら異母兄妹", () => {
    const dad = beetle("dad");
    const mom1 = beetle("mom1");
    const mom2 = beetle("mom2");
    const a = beetle("a", { sourceLineId: "L1" });
    const b = beetle("b", { sourceLineId: "L2" });

    const r = relationOf(
      a,
      b,
      [dad, mom1, mom2, a, b],
      [line("L1", "dad", "mom1"), line("L2", "dad", "mom2")]
    );
    expect(r.kind).toBe("half-siblings");
    if (r.kind === "half-siblings") expect(r.shared.id).toBe("dad");
  });

  it("祖父と孫は直系として出す", () => {
    const gf = beetle("gf");
    const gm = beetle("gm");
    const dad = beetle("dad", { sourceLineId: "L0" });
    const mom = beetle("mom");
    const kid = beetle("kid", { sourceLineId: "L1" });

    const r = relationOf(
      gf,
      kid,
      [gf, gm, dad, mom, kid],
      [line("L0", "gf", "gm"), line("L1", "dad", "mom")]
    );
    expect(r.kind).toBe("direct");
    if (r.kind === "direct") {
      expect(r.ancestor.id).toBe("gf");
      expect(r.descendant.id).toBe("kid");
    }
  });

  it("いとこどうしは、共通の祖先として出す", () => {
    const gf = beetle("gf");
    const gm = beetle("gm");
    // 兄妹だが、それぞれ別の相手と組んでいる
    const bro = beetle("bro", { sourceLineId: "L0" });
    const sis = beetle("sis", { sourceLineId: "L0" });
    const outsiderA = beetle("outA");
    const outsiderB = beetle("outB");
    const cousinA = beetle("cousinA", { sourceLineId: "L1" });
    const cousinB = beetle("cousinB", { sourceLineId: "L2" });

    const r = relationOf(
      cousinA,
      cousinB,
      [gf, gm, bro, sis, outsiderA, outsiderB, cousinA, cousinB],
      [
        line("L0", "gf", "gm"),
        line("L1", "bro", "outA"),
        line("L2", "outB", "sis"),
      ]
    );

    expect(r.kind).toBe("shared-ancestor");
    if (r.kind === "shared-ancestor") {
      expect(r.shared.map((b) => b.id).sort()).toEqual(["gf", "gm"]);
    }
  });

  it("親が記録から消えていれば、繋がりは分からない", () => {
    const a = beetle("a", { sourceLineId: "L1" });
    const b = beetle("b", { sourceLineId: "L1" });
    // ライン自体が残っていない
    expect(relationOf(a, b, [a, b], []).kind).toBe("unrelated");
  });

  it("近いかどうかの見分け", () => {
    expect(isClose({ kind: "siblings" })).toBe(true);
    expect(isClose({ kind: "unrelated" })).toBe(false);
    expect(isClose({ kind: "shared-ancestor", shared: [] })).toBe(false);
  });
});
