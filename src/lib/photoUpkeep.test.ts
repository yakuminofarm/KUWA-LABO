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

const { embedPhotos, migrateEmbeddedPhotos, sweepOrphanPhotos } = await import(
  "@/lib/photoUpkeep"
);
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
    expect(moved.photoId).toBeTruthy();
    expect(moved.photoUrl).toBeUndefined();
    expect(store.get(moved.photoId!)).toBe("data:image/jpeg;base64,AAA");
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
    expect(ok.photoId).toBeTruthy();
    expect(ok.photoUrl).toBeUndefined();
    // 消してしまうと写真が失われる
    expect(ng.photoId).toBeUndefined();
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

  it("元の記録を書き換えない", async () => {
    store.set("p1", "data:image/jpeg;base64,AAA");
    const input = data([beetle("a", { photoId: "p1" })]);
    await embedPhotos(input);
    expect((input as unknown as { beetles: { photoId?: string }[] }).beetles[0].photoId).toBe(
      "p1"
    );
  });
});
