import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 写真を記録の外へ出したときに、いちばん怖いのは「移す途中で写真が消える」こと。
 * 置き場は端末ごとに違うので偽物に差し替え、記録のほうの出入りだけを確かめる。
 */
const store = new Map<string, string>();
let failOn: string | null = null;

vi.mock("@/lib/photoStore", () => ({
  savePhoto: vi.fn(async (sizes: { full: string; thumb?: string }) => {
    if (failOn && sizes.full.includes(failOn)) throw new Error("書けなかった");
    const id = `p${store.size + 1}`;
    store.set(id, sizes.full);
    return id;
  }),
  readPhotoDataUrl: vi.fn(async (id: string) => store.get(id)),
  removePhoto: vi.fn(async (id: string) => void store.delete(id)),
  listPhotoIds: vi.fn(async () => [...store.keys()]),
}));

const { embedPhotos, migrateEmbeddedPhotos, migrateSinglePhotos, sweepOrphanPhotos } =
  await import("@/lib/photoUpkeep");
const { useKuwagataStore } = await import("@/store/kuwagataStore");

function seed(beetles: unknown[], larvae: unknown[] = []) {
  useKuwagataStore.setState({
    beetles: beetles as never,
    larvae: larvae as never,
  });
}

const beetle = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  code: id,
  species: "オオクワガタ",
  acquiredDate: "2026-01-01",
  isAlive: true,
  notes: "",
  ...extra,
});

beforeEach(() => {
  store.clear();
  failOn = null;
  seed([], []);
});

describe("migrateEmbeddedPhotos (旧形式を置き場へ移す)", () => {
  it("写真を抱えた記録を、参照だけに置き換える", async () => {
    seed([beetle("a", { photoUrl: "data:image/jpeg;base64,AAA" })]);

    expect(await migrateEmbeddedPhotos()).toBe(1);

    const [moved] = useKuwagataStore.getState().beetles;
    // 成虫は複数枚持てるので、移した先は photoIds の1枚目
    expect(moved.photoIds).toHaveLength(1);
    expect(moved.photoId).toBeUndefined();
    expect(moved.photoUrl).toBeUndefined();
    expect(store.get(moved.photoIds![0])).toBe("data:image/jpeg;base64,AAA");
  });

  it("成虫と幼虫の両方をまとめて移す", async () => {
    seed(
      [beetle("a", { photoUrl: "data:image/jpeg;base64,AAA" })],
      [beetle("v", { photoUrl: "data:image/jpeg;base64,BBB" })]
    );

    expect(await migrateEmbeddedPhotos()).toBe(2);
    expect(useKuwagataStore.getState().larvae[0].photoId).toBeTruthy();
  });

  it("書けなかった写真は記録側をそのまま残す (次の起動でやり直せる)", async () => {
    failOn = "BBB";
    seed([
      beetle("a", { photoUrl: "data:image/jpeg;base64,AAA" }),
      beetle("b", { photoUrl: "data:image/jpeg;base64,BBB" }),
    ]);

    expect(await migrateEmbeddedPhotos()).toBe(1);

    const [ok, ng] = useKuwagataStore.getState().beetles;
    expect(ok.photoIds).toHaveLength(1);
    expect(ok.photoUrl).toBeUndefined();
    // 消してしまうと写真が失われる
    expect(ng.photoIds).toBeUndefined();
    expect(ng.photoUrl).toBe("data:image/jpeg;base64,BBB");
  });

  it("移すものが無ければ何もしない", async () => {
    seed([beetle("a", { photoId: "p9" })]);
    expect(await migrateEmbeddedPhotos()).toBe(0);
    expect(useKuwagataStore.getState().beetles[0].photoId).toBe("p9");
  });

  it("2回走らせても写真は増えない", async () => {
    seed([beetle("a", { photoUrl: "data:image/jpeg;base64,AAA" })]);
    await migrateEmbeddedPhotos();
    await migrateEmbeddedPhotos();
    expect(store.size).toBe(1);
  });

  it("2枚目以降 (photoUrls) も順番どおりに移す", async () => {
    seed([
      beetle("a", {
        photoUrl: "data:image/jpeg;base64,AAA",
        photoUrls: ["data:image/jpeg;base64,BBB", "data:image/jpeg;base64,CCC"],
      }),
    ]);

    expect(await migrateEmbeddedPhotos()).toBe(3);

    const [moved] = useKuwagataStore.getState().beetles;
    expect(moved.photoIds).toHaveLength(3);
    expect(moved.photoUrls).toBeUndefined();
    expect(moved.photoIds!.map((id) => store.get(id))).toEqual([
      "data:image/jpeg;base64,AAA",
      "data:image/jpeg;base64,BBB",
      "data:image/jpeg;base64,CCC",
    ]);
  });

  // 移行を待っているあいだに写真を足した記録。あとから前に足すので、
  // もともと1枚目だった写真が1枚目のまま残る
  it("移行前に足された写真を上書きしない", async () => {
    store.set("new", "data:image/jpeg;base64,NEW");
    seed([beetle("a", { photoUrl: "data:image/jpeg;base64,OLD", photoIds: ["new"] })]);

    await migrateEmbeddedPhotos();

    const [moved] = useKuwagataStore.getState().beetles;
    expect(moved.photoIds!.map((id) => store.get(id))).toEqual([
      "data:image/jpeg;base64,OLD",
      "data:image/jpeg;base64,NEW",
    ]);
  });

  it("幼虫は1枚のまま (photoId に入る)", async () => {
    seed([], [beetle("v", { photoUrl: "data:image/jpeg;base64,BBB" })]);
    await migrateEmbeddedPhotos();
    const [larva] = useKuwagataStore.getState().larvae;
    expect(larva.photoId).toBeTruthy();
    expect((larva as { photoIds?: string[] }).photoIds).toBeUndefined();
  });
});

describe("migrateSinglePhotos (1枚だけの形を複数枚の形に移す)", () => {
  it("photoId を photoIds の1枚目にする", () => {
    seed([beetle("a", { photoId: "p9" })]);

    expect(migrateSinglePhotos()).toBe(1);

    const [moved] = useKuwagataStore.getState().beetles;
    expect(moved.photoIds).toEqual(["p9"]);
    expect(moved.photoId).toBeUndefined();
  });

  it("もう photoIds を持っている記録には触らない", () => {
    seed([beetle("a", { photoIds: ["p1", "p2"] })]);
    expect(migrateSinglePhotos()).toBe(0);
    expect(useKuwagataStore.getState().beetles[0].photoIds).toEqual(["p1", "p2"]);
  });

  it("2回走らせても同じ", () => {
    seed([beetle("a", { photoId: "p9" })]);
    migrateSinglePhotos();
    expect(migrateSinglePhotos()).toBe(0);
    expect(useKuwagataStore.getState().beetles[0].photoIds).toEqual(["p9"]);
  });
});

describe("sweepOrphanPhotos (迷子の片付け)", () => {
  it("どの記録からも参照されていない写真だけ消す", async () => {
    store.set("used", "data:image/jpeg;base64,AAA");
    store.set("orphan", "data:image/jpeg;base64,BBB");
    seed([beetle("a", { photoId: "used" })]);

    expect(await sweepOrphanPhotos()).toBe(1);
    expect([...store.keys()]).toEqual(["used"]);
  });

  it("幼虫が使っている写真は残す", async () => {
    store.set("byLarva", "data:image/jpeg;base64,AAA");
    seed([], [beetle("v", { photoId: "byLarva" })]);

    expect(await sweepOrphanPhotos()).toBe(0);
    expect(store.has("byLarva")).toBe(true);
  });

  it("成虫へ引き上げて同じ写真を共有していても消さない", async () => {
    store.set("shared", "data:image/jpeg;base64,AAA");
    seed([beetle("a", { photoId: "shared" })], [beetle("v", { photoId: "shared" })]);

    expect(await sweepOrphanPhotos()).toBe(0);
    expect(store.has("shared")).toBe(true);
  });

  // ここを1枚ぶんしか見ないと、2枚目以降が毎回の起動で消える
  it("2枚目以降も参照として数える", async () => {
    store.set("p1", "data:image/jpeg;base64,AAA");
    store.set("p2", "data:image/jpeg;base64,BBB");
    store.set("p3", "data:image/jpeg;base64,CCC");
    seed([beetle("a", { photoIds: ["p1", "p2", "p3"] })]);

    expect(await sweepOrphanPhotos()).toBe(0);
    expect([...store.keys()]).toEqual(["p1", "p2", "p3"]);
  });

  it("外した写真だけ消える", async () => {
    store.set("keep", "data:image/jpeg;base64,AAA");
    store.set("dropped", "data:image/jpeg;base64,BBB");
    seed([beetle("a", { photoIds: ["keep"] })]);

    expect(await sweepOrphanPhotos()).toBe(1);
    expect([...store.keys()]).toEqual(["keep"]);
  });
});

describe("embedPhotos (書き出し用に写真を埋め戻す)", () => {
  const data = (beetles: unknown[], larvae: unknown[] = []) =>
    ({ beetles, larvae, lines: [], expenses: [] }) as never;

  it("参照を写真そのものに戻し、参照は落とす", async () => {
    store.set("p1", "data:image/jpeg;base64,AAA");

    const out = await embedPhotos(data([beetle("a", { photoId: "p1" })]));

    expect(out.beetles[0].photoUrl).toBe("data:image/jpeg;base64,AAA");
    expect(out.beetles[0].photoId).toBeUndefined();
  });

  it("置き場に無い参照は、写真なしとして書き出す", async () => {
    const out = await embedPhotos(data([beetle("a", { photoId: "missing" })]));
    expect(out.beetles[0].photoUrl).toBeUndefined();
  });

  it("旧形式のまま持っている記録はそのまま通す", async () => {
    const out = await embedPhotos(
      data([beetle("a", { photoUrl: "data:image/jpeg;base64,ZZZ" })])
    );
    expect(out.beetles[0].photoUrl).toBe("data:image/jpeg;base64,ZZZ");
  });

  it("主な1枚は photoUrl、2枚目以降は photoUrls に入れる", async () => {
    store.set("p1", "data:image/jpeg;base64,AAA");
    store.set("p2", "data:image/jpeg;base64,BBB");

    const out = await embedPhotos(data([beetle("a", { photoIds: ["p1", "p2"] })]));

    // 古いくわらぼは photoUrl しか見ないので、主な1枚はそこに入れる
    expect(out.beetles[0].photoUrl).toBe("data:image/jpeg;base64,AAA");
    expect(out.beetles[0].photoUrls).toEqual(["data:image/jpeg;base64,BBB"]);
    expect(out.beetles[0].photoIds).toBeUndefined();
  });

  it("1枚だけなら photoUrls は付けない", async () => {
    store.set("p1", "data:image/jpeg;base64,AAA");
    const out = await embedPhotos(data([beetle("a", { photoIds: ["p1"] })]));
    expect(out.beetles[0].photoUrls).toBeUndefined();
  });

  it("読めなかった1枚は飛ばし、残りを書き出す", async () => {
    store.set("p2", "data:image/jpeg;base64,BBB");
    const out = await embedPhotos(data([beetle("a", { photoIds: ["missing", "p2"] })]));
    expect(out.beetles[0].photoUrl).toBe("data:image/jpeg;base64,BBB");
    expect(out.beetles[0].photoUrls).toBeUndefined();
  });

  it("元の記録を書き換えない", async () => {
    store.set("p1", "data:image/jpeg;base64,AAA");
    const input = data([beetle("a", { photoId: "p1" })]);
    await embedPhotos(input);
    expect((input as unknown as { beetles: { photoId?: string }[] }).beetles[0].photoId).toBe(
      "p1"
    );
  });
});
