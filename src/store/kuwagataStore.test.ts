import { beforeEach, describe, expect, it } from "vitest";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { calcCostSummary, splitPairAmount } from "@/lib/breeding";
import { Beetle, Larva } from "@/types";

function larva(overrides: Partial<Larva> = {}): Larva {
  return {
    id: "l1",
    code: "26A",
    species: "オオクワガタ",
    stage: "adult",
    gender: "unknown",
    bottleChanges: [],
    isAlive: true,
    notes: "",
    ...overrides,
  };
}

// テストごとに素の状態へ戻す。localStorage 越しの持ち越しを断つため
// resetAll ではなく直接 setState する (resetAll 自身は別途テストする)
function resetStore() {
  useKuwagataStore.setState({
    beetles: [],
    lines: [],
    larvae: [],
    expenses: [],
    lastBackupAt: undefined,
  });
}

beforeEach(resetStore);

describe("promoteLarva (幼虫→成虫の引き上げ)", () => {
  it("入手金額を成虫側に写さない (総支出が引き上げ前後で変わらない)", () => {
    useKuwagataStore.setState({
      larvae: [
        larva({
          priceYen: 3000,
          bottleChanges: [{ id: "c1", date: "2026-01-01", bottleType: "菌糸ビン", costYen: 3000 }],
        }),
      ],
    });
    const before = calcCostSummary(
      useKuwagataStore.getState().beetles,
      useKuwagataStore.getState().larvae,
      []
    ).totalSpent;
    expect(before).toBe(6000);

    const beetle = useKuwagataStore.getState().promoteLarva("l1", {
      code: "No.1",
      gender: "male",
    });

    expect(beetle).toBeDefined();
    expect(beetle!.priceYen).toBeUndefined();

    const after = calcCostSummary(
      useKuwagataStore.getState().beetles,
      useKuwagataStore.getState().larvae,
      []
    ).totalSpent;
    expect(after).toBe(before);
  });

  it("引き上げた幼虫レコードは消えず、成虫と相互にリンクする", () => {
    useKuwagataStore.setState({ larvae: [larva()] });
    const beetle = useKuwagataStore.getState().promoteLarva("l1", { code: "No.1", gender: "male" });

    const s = useKuwagataStore.getState();
    expect(s.larvae).toHaveLength(1);
    expect(s.larvae[0].promotedBeetleId).toBe(beetle!.id);
    expect(beetle!.sourceLarvaId).toBe("l1");
  });

  it("同じ幼虫を二重に引き上げられない", () => {
    useKuwagataStore.setState({ larvae: [larva()] });
    const first = useKuwagataStore.getState().promoteLarva("l1", { code: "No.1", gender: "male" });
    expect(first).toBeDefined();

    const second = useKuwagataStore.getState().promoteLarva("l1", { code: "No.2", gender: "male" });
    expect(second).toBeUndefined();
    expect(useKuwagataStore.getState().beetles).toHaveLength(1);
  });

  it("成虫側が削除されていれば、同じ幼虫から登録し直せる", () => {
    useKuwagataStore.setState({ larvae: [larva()] });
    const first = useKuwagataStore.getState().promoteLarva("l1", { code: "No.1", gender: "male" });
    useKuwagataStore.getState().deleteBeetle(first!.id);

    const second = useKuwagataStore.getState().promoteLarva("l1", { code: "No.2", gender: "male" });
    expect(second).toBeDefined();
    expect(useKuwagataStore.getState().beetles).toHaveLength(1);
  });

  it("まとまり (頭数>1) のままでは引き上げられない (残りの頭数の行方が分からなくなるため)", () => {
    useKuwagataStore.setState({ larvae: [larva({ count: 20 })] });
    const beetle = useKuwagataStore.getState().promoteLarva("l1", { code: "No.1", gender: "male" });
    expect(beetle).toBeUndefined();
    expect(useKuwagataStore.getState().beetles).toHaveLength(0);
  });
});

describe("splitLarva (まとまりから1頭を切り出す)", () => {
  it("費用は元のまとまりに残し、切り出した側には写さない (総支出は変わらない)", () => {
    useKuwagataStore.setState({
      larvae: [
        larva({
          count: 5,
          priceYen: 6000,
          bottleChanges: [{ id: "c1", date: "2026-01-01", bottleType: "マット", costYen: 0 }],
        }),
      ],
    });
    const before = calcCostSummary([], useKuwagataStore.getState().larvae, []).totalSpent;

    const newId = useKuwagataStore.getState().splitLarva("l1");
    expect(newId).toBeDefined();

    const s = useKuwagataStore.getState();
    const original = s.larvae.find((l) => l.id === "l1")!;
    const split = s.larvae.find((l) => l.id === newId)!;
    expect(original.count).toBe(4);
    expect(split.count).toBe(1);
    expect(split.priceYen).toBeUndefined();
    expect(split.bottleChanges).toHaveLength(0);

    const after = calcCostSummary([], s.larvae, []).totalSpent;
    expect(after).toBe(before);
  });

  it("1頭しかないまとまりでは何もしない", () => {
    useKuwagataStore.setState({ larvae: [larva({ count: 1 })] });
    const result = useKuwagataStore.getState().splitLarva("l1");
    expect(result).toBeUndefined();
    expect(useKuwagataStore.getState().larvae).toHaveLength(1);
  });

  it("引き上げ済みの印は切り出した側には引き継がない", () => {
    useKuwagataStore.setState({
      larvae: [larva({ count: 2, promotedBeetleId: "some-beetle-id" })],
    });
    const newId = useKuwagataStore.getState().splitLarva("l1");
    const split = useKuwagataStore.getState().larvae.find((l) => l.id === newId)!;
    expect(split.promotedBeetleId).toBeUndefined();
  });
});

describe("recordBackup", () => {
  it("バックアップの記録時刻を更新する", () => {
    expect(useKuwagataStore.getState().lastBackupAt).toBeUndefined();
    useKuwagataStore.getState().recordBackup();
    expect(useKuwagataStore.getState().lastBackupAt).toBeDefined();
  });
});

describe("addBeetlePair (ペアで迎える)", () => {
  const pair = (malePrice: number, femalePrice: number) => {
    const male: Beetle = {
      id: "m1", code: "26OK-A1", species: "オオクワガタ", gender: "male",
      acquiredDate: "2026-08-01", priceYen: malePrice, pairId: "f1", isAlive: true, notes: "",
    };
    const female: Beetle = { ...male, id: "f1", code: "26OK-A2", gender: "female", priceYen: femalePrice, pairId: "m1" };
    return [male, female] as const;
  };

  it("2頭を互いに紐づけて迎える", () => {
    const [m, f] = pair(10000, 10000);
    useKuwagataStore.getState().addBeetlePair(m, f);
    const list = useKuwagataStore.getState().beetles;
    expect(list).toHaveLength(2);
    expect(list.find((b) => b.id === "m1")!.pairId).toBe("f1");
    expect(list.find((b) => b.id === "f1")!.pairId).toBe("m1");
  });

  it("ペアの合計を分けて持たせても、総支出は入力した金額と一致する", () => {
    const [m, f] = pair(...splitPairAmount(15001));
    useKuwagataStore.getState().addBeetlePair(m, f);
    const s = useKuwagataStore.getState();
    // 片方に全額を写したり、両方に合計を入れたりすると、ここがずれる
    expect(calcCostSummary(s.beetles, s.larvae, s.expenses).totalSpent).toBe(15001);
  });

  it("片方を消すと、残った側のペアの印も外れる", () => {
    const [m, f] = pair(10000, 10000);
    useKuwagataStore.getState().addBeetlePair(m, f);
    useKuwagataStore.getState().deleteBeetle("m1");
    const rest = useKuwagataStore.getState().beetles;
    expect(rest).toHaveLength(1);
    // 居ない個体を指したままにすると、詳細画面が空の相手を出してしまう
    expect(rest[0].pairId).toBeUndefined();
  });

  it("ペアでまとめて販売しても、売上は入力した金額と一致する", () => {
    const [m, f] = pair(...splitPairAmount(20000));
    useKuwagataStore.getState().addBeetlePair(m, f);
    const [mine, theirs] = splitPairAmount(16001);
    useKuwagataStore.getState().updateBeetle("m1", { soldDate: "2026-08-20", soldPriceYen: mine });
    useKuwagataStore.getState().updateBeetle("f1", { soldDate: "2026-08-20", soldPriceYen: theirs });
    const s = useKuwagataStore.getState();
    expect(calcCostSummary(s.beetles, s.larvae, s.expenses).salesTotal).toBe(16001);
  });
});
