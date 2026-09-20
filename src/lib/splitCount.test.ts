import { beforeEach, describe, expect, it } from "vitest";
import {
  SplitTally,
  bump,
  buildSplitLarvae,
  clearDraft,
  emptyTally,
  loadDraft,
  nextCodeNumber,
  saveDraft,
  tallyLarvae,
  tallyTotal,
} from "@/lib/splitCount";
import { BreedingLine, Larva } from "@/types";

const line: BreedingLine = {
  id: "L1",
  name: "2026-A",
  species: "オオクワガタ",
  status: "laying",
  notes: "",
};

const larva = (code: string, extra: Partial<Larva> = {}): Larva => ({
  id: code,
  code,
  lineId: "L1",
  species: "オオクワガタ",
  stage: "L1",
  gender: "unknown",
  bottleChanges: [],
  isAlive: true,
  notes: "",
  ...extra,
});

const tally = (over: Partial<SplitTally> = {}): SplitTally => ({ ...emptyTally(), ...over });

describe("数える", () => {
  it("押した段階だけ増える", () => {
    expect(bump(emptyTally(), "L2", 1)).toEqual({ egg: 0, L1: 0, L2: 1, L3: 0 });
  });

  it("戻しても0より下がらない (数え間違いは必ず起きる)", () => {
    expect(bump(emptyTally(), "egg", -1).egg).toBe(0);
  });

  it("合計は卵も含む、幼虫の数は卵を含まない", () => {
    const t = tally({ egg: 5, L1: 3, L2: 2, L3: 1 });
    expect(tallyTotal(t)).toBe(11);
    expect(tallyLarvae(t)).toBe(6);
  });
});

describe("nextCodeNumber", () => {
  it("まだ無ければ1から", () => {
    expect(nextCodeNumber("2026-A", [])).toBe(1);
  });

  it("いちばん大きい番号の次にする", () => {
    expect(nextCodeNumber("2026-A", [larva("2026-A-01"), larva("2026-A-07")])).toBe(8);
  });

  // 件数から出すと、途中で1頭消したときに同じ番号が2つできる
  it("件数ではなく番号から出す", () => {
    expect(nextCodeNumber("2026-A", [larva("2026-A-03")])).toBe(4);
  });

  it("よそのラインの番号は数えない", () => {
    expect(nextCodeNumber("2026-A", [larva("2026-B-09"), larva("2025-Z-20")])).toBe(1);
  });

  it("形の違う管理番号は飛ばす", () => {
    expect(nextCodeNumber("2026-A", [larva("2026-A-おかわり"), larva("2026-A-02")])).toBe(3);
  });
});

describe("buildSplitLarvae", () => {
  it("数えたぶんだけ記録を作る", () => {
    const out = buildSplitLarvae(line, tally({ egg: 2, L1: 1 }), "2026-06-01", []);
    expect(out).toHaveLength(3);
    expect(out.map((l) => l.stage)).toEqual(["egg", "egg", "L1"]);
    expect(out.map((l) => l.code)).toEqual(["2026-A-01", "2026-A-02", "2026-A-03"]);
  });

  it("続きの番号から振る", () => {
    const out = buildSplitLarvae(line, tally({ L1: 2 }), "2026-06-01", [larva("2026-A-05")]);
    expect(out.map((l) => l.code)).toEqual(["2026-A-06", "2026-A-07"]);
  });

  // 卵はまだ孵化していない。掘り出した日を孵化日にすると、
  // そこから日数を数える画面がすべてずれる
  it("卵に孵化日を入れない", () => {
    const out = buildSplitLarvae(line, tally({ egg: 1, L1: 1 }), "2026-06-01", []);
    expect(out[0].hatchDate).toBeUndefined();
    expect(out[1].hatchDate).toBe("2026-06-01");
  });

  it("ラインと種類を引き継ぐ", () => {
    const [only] = buildSplitLarvae(line, tally({ L3: 1 }), "2026-06-01", []);
    expect(only.lineId).toBe("L1");
    expect(only.species).toBe("オオクワガタ");
    expect(only.isAlive).toBe(true);
  });

  it("0なら何も作らない", () => {
    expect(buildSplitLarvae(line, emptyTally(), "2026-06-01", [])).toEqual([]);
  });

  it("id は1件ずつ別になる", () => {
    const out = buildSplitLarvae(line, tally({ L1: 3 }), "2026-06-01", []);
    expect(new Set(out.map((l) => l.id)).size).toBe(3);
  });
});

describe("途中の数を残す", () => {
  beforeEach(() => clearDraft());

  it("残して読み戻せる", () => {
    saveDraft({ lineId: "L1", tally: tally({ egg: 3 }), date: "2026-06-01" });
    expect(loadDraft("L1")?.tally.egg).toBe(3);
  });

  it("別のラインのものは読まない", () => {
    saveDraft({ lineId: "L1", tally: tally({ egg: 3 }), date: "2026-06-01" });
    expect(loadDraft("L2")).toBeNull();
  });

  it("0しか無ければ無かったことにする", () => {
    saveDraft({ lineId: "L1", tally: emptyTally(), date: "2026-06-01" });
    expect(loadDraft("L1")).toBeNull();
  });

  it("消したら読めなくなる", () => {
    saveDraft({ lineId: "L1", tally: tally({ L1: 1 }), date: "2026-06-01" });
    clearDraft();
    expect(loadDraft("L1")).toBeNull();
  });

  // 人が触れる場所なので、形が違うものが入っていることがある
  it("壊れた中身では落ちない", () => {
    localStorage.setItem("kuwa-split-draft", "{ここは壊れている");
    expect(loadDraft("L1")).toBeNull();
    localStorage.setItem("kuwa-split-draft", JSON.stringify({ lineId: "L1", tally: "5" }));
    expect(loadDraft("L1")).toBeNull();
    localStorage.setItem(
      "kuwa-split-draft",
      JSON.stringify({ lineId: "L1", date: "2026-06-01", tally: { egg: -3, L1: "x", L2: 2.7 } })
    );
    expect(loadDraft("L1")?.tally).toEqual({ egg: 0, L1: 0, L2: 2, L3: 0 });
  });
});
