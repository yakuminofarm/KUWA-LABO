import { describe, expect, it } from "vitest";
import {
  PHOTO_MAX,
  mainPhotoRef,
  photoCount,
  photoEntries,
  photoIdsOf,
  photoPatch,
} from "@/lib/photoRef";

describe("photoIdsOf", () => {
  it("いまの形をそのまま返す", () => {
    expect(photoIdsOf({ photoIds: ["a", "b"] })).toEqual(["a", "b"]);
  });

  it("1枚だけの形も読める", () => {
    expect(photoIdsOf({ photoId: "a" })).toEqual(["a"]);
  });

  it("photoIds があれば photoId は見ない (移行ずみの記録)", () => {
    expect(photoIdsOf({ photoIds: ["new"], photoId: "old" })).toEqual(["new"]);
  });

  it("写真が無ければ空", () => {
    expect(photoIdsOf({})).toEqual([]);
  });

  // 移行前の写真は置き場に無いので、id では引けない
  it("旧形式 (中身を抱えたまま) は id を持たない", () => {
    expect(photoIdsOf({ photoUrl: "data:image/jpeg;base64,AAA" })).toEqual([]);
  });
});

describe("photoEntries", () => {
  it("移行前の写真を1枚目として通す", () => {
    expect(photoEntries({ photoUrl: "data:x", photoIds: ["a"] })).toEqual([
      { photoUrl: "data:x" },
      { photoId: "a" },
    ]);
  });

  it("置き場の写真は入れた順に並ぶ", () => {
    expect(photoEntries({ photoIds: ["a", "b"] })).toEqual([{ photoId: "a" }, { photoId: "b" }]);
  });
});

describe("mainPhotoRef", () => {
  it("先頭の1枚を返す", () => {
    expect(mainPhotoRef({ photoIds: ["a", "b"] })).toEqual({ photoId: "a" });
  });

  it("移行前なら中身そのものを返す", () => {
    expect(mainPhotoRef({ photoUrl: "data:x" })).toEqual({ photoUrl: "data:x" });
  });

  it("写真が無ければ空の参照 (呼ぶ側で分岐しなくてよい)", () => {
    expect(mainPhotoRef({})).toEqual({});
  });
});

describe("photoCount", () => {
  it("移行前の1枚も数える", () => {
    expect(photoCount({ photoUrl: "data:x", photoIds: ["a"] })).toBe(2);
    expect(photoCount({})).toBe(0);
    expect(photoCount({ photoId: "a" })).toBe(1);
  });
});

describe("photoPatch", () => {
  it("1枚だけの形は消す", () => {
    expect(photoPatch(["a", "b"])).toEqual({ photoIds: ["a", "b"], photoId: undefined });
  });

  it("全部外したら欄そのものを空にする", () => {
    expect(photoPatch([])).toEqual({ photoIds: undefined, photoId: undefined });
  });

  // photoUrl は移行の持ち物。ここで消すと、置き場へ移す前に中身ごと失う
  it("旧形式の中身には触らない", () => {
    expect(photoPatch(["a"])).not.toHaveProperty("photoUrl");
  });
});

describe("PHOTO_MAX", () => {
  it("上限がある (1頭に何十枚も入ると端末が重くなる)", () => {
    expect(PHOTO_MAX).toBeGreaterThan(1);
    expect(PHOTO_MAX).toBeLessThanOrEqual(10);
  });
});
