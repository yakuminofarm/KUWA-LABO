import { describe, expect, it } from "vitest";
import { lineResult, parentResult } from "@/lib/offspring";
import { Beetle, BreedingLine, Larva } from "@/types";

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

describe("lineResult", () => {
  it("そのラインの幼虫だけを数える", () => {
    const l = line("L1");
    const r = lineResult(
      l,
      [larva("a", "L1"), larva("b", "L1"), larva("c", "べつのライン")],
      []
    );
    expect(r.larvaHeads).toBe(2);
  });

  it("まとまりの記録は頭数ぶん数える", () => {
    const r = lineResult(line("L1"), [larva("a", "L1", { count: 12 })], []);
    expect(r.larvaHeads).toBe(12);
    expect(r.aliveHeads).toBe(12);
  });

  it("死んだ幼虫は生存数から外すが、採れた数には残す", () => {
    const r = lineResult(
      line("L1"),
      [larva("a", "L1", { count: 5 }), larva("b", "L1", { count: 3, isAlive: false })],
      []
    );
    expect(r.larvaHeads).toBe(8);
    expect(r.aliveHeads).toBe(5);
  });

  it("羽化日・羽化サイズ・引き上げた成虫のどれかがあれば羽化と数える", () => {
    const promoted = beetle("adult", { sizeMm: 80 });
    const r = lineResult(
      line("L1"),
      [
        larva("byDate", "L1", { emergedDate: "2026-06-01" }),
        larva("bySize", "L1", { emergedSizeMm: 72.5 }),
        larva("byAdult", "L1", { promotedBeetleId: "adult" }),
        larva("stillLarva", "L1"),
      ],
      [promoted]
    );
    expect(r.emergedHeads).toBe(3);
    expect(r.larvaHeads).toBe(4);
  });

  it("いちばん大きい羽化サイズを出す", () => {
    const r = lineResult(
      line("L1"),
      [
        larva("a", "L1", { emergedSizeMm: 74.2 }),
        larva("b", "L1", { emergedSizeMm: 81.5 }),
        larva("c", "L1", { emergedSizeMm: 68.0 }),
      ],
      []
    );
    expect(r.bestSizeMm).toBe(81.5);
  });

  it("成虫にしてから測り直していれば、そちらを採る", () => {
    // 羽化直後は72mm、落ち着いてから測ったら78mm
    const grown = beetle("adult", { sizeMm: 78 });
    const r = lineResult(
      line("L1"),
      [larva("a", "L1", { emergedSizeMm: 72, promotedBeetleId: "adult" })],
      [grown]
    );
    expect(r.bestSizeMm).toBe(78);
  });

  it("サイズを1つも測っていなければ、最大は出さない", () => {
    const r = lineResult(line("L1"), [larva("a", "L1", { emergedDate: "2026-06-01" })], []);
    expect(r.bestSizeMm).toBeUndefined();
  });

  it("引き上げた先の成虫が消えていても、羽化数は崩れない", () => {
    const r = lineResult(line("L1"), [larva("a", "L1", { promotedBeetleId: "いない" })], []);
    expect(r.emergedHeads).toBe(0);
    expect(r.larvaHeads).toBe(1);
  });
});

describe("parentResult", () => {
  it("種親に使ったライン全部を合わせる", () => {
    const mom = beetle("mom");
    const lines = [line("L1", "dad1", "mom"), line("L2", "dad2", "mom"), line("L3", "x", "y")];
    const larvae = [
      larva("a", "L1", { count: 10, emergedSizeMm: 79 }),
      larva("b", "L2", { count: 6, emergedSizeMm: 83.5 }),
      larva("c", "L3", { count: 99 }), // 別の親のライン
    ];

    const r = parentResult(mom, lines, larvae, []);

    expect(r.lines).toHaveLength(2);
    expect(r.larvaHeads).toBe(16);
    expect(r.emergedHeads).toBe(16);
    expect(r.bestSizeMm).toBe(83.5);
  });

  it("♂として使っていても数える", () => {
    const dad = beetle("dad");
    const r = parentResult(dad, [line("L1", "dad", "mom")], [larva("a", "L1", { count: 4 })], []);
    expect(r.larvaHeads).toBe(4);
  });

  it("種親に使っていなければ空", () => {
    const b = beetle("b");
    const r = parentResult(b, [line("L1", "x", "y")], [larva("a", "L1")], []);
    expect(r.lines).toHaveLength(0);
    expect(r.larvaHeads).toBe(0);
    expect(r.bestSizeMm).toBeUndefined();
  });
});
