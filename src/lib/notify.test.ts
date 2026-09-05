import { afterEach, describe, expect, it, vi } from "vitest";
import { readPermission, requestPermission, showSample, syncFeedingNotices } from "@/lib/notify";

/**
 * ここで確かめたいのは「ブラウザ版のときに端末側の仕組みへ手を出さないこと」。
 *
 * テストは NEXT_PUBLIC_KUWA_TARGET を立てずに走るので IS_NATIVE は false になり、
 * ブラウザ版と同じ道を通る。アプリ版の実際の鳴り方は端末でしか確かめられない。
 */

type FakeNotification = {
  (title: string, options?: { body?: string }): void;
  permission: string;
  requestPermission: () => Promise<string>;
};

function stubNotification(permission: string, onNew?: (t: string, b?: string) => void) {
  const ctor = function (title: string, options?: { body?: string }) {
    onNew?.(title, options?.body);
  } as unknown as FakeNotification;
  ctor.permission = permission;
  ctor.requestPermission = vi.fn(async () => "granted");
  (globalThis as Record<string, unknown>).Notification = ctor;
  return ctor;
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).Notification;
});

describe("readPermission (ブラウザ版)", () => {
  it("ブラウザの許可状態をそのまま返す", async () => {
    stubNotification("granted");
    await expect(readPermission()).resolves.toBe("granted");
  });

  it("通知の仕組みが無い環境では unsupported", async () => {
    delete (globalThis as Record<string, unknown>).Notification;
    await expect(readPermission()).resolves.toBe("unsupported");
  });
});

describe("requestPermission (ブラウザ版)", () => {
  it("ブラウザに許可を尋ねる", async () => {
    const ctor = stubNotification("default");
    await expect(requestPermission()).resolves.toBe("granted");
    expect(ctor.requestPermission).toHaveBeenCalled();
  });
});

describe("showSample (ブラウザ版)", () => {
  it("その場で1件だけ出す", async () => {
    const seen: { title: string; body?: string }[] = [];
    stubNotification("granted", (title, body) => seen.push({ title, body }));
    await showSample();
    expect(seen).toEqual([{ title: "くわらぼ", body: "この形でお知らせします" }]);
  });
});

describe("syncFeedingNotices (ブラウザ版)", () => {
  it("何もせずに終わる (積んでおく仕組みはアプリ版にしかない)", async () => {
    // 端末の機能を呼びにいこうとすると、ここで落ちるか固まる。
    // 素通りできることが「ブラウザ版に持ち込んでいない」ことの確認になる
    await expect(
      syncFeedingNotices([
        { id: 1, at: new Date("2026-09-06T19:00:00"), title: "t", body: "b" },
      ])
    ).resolves.toBeUndefined();
  });

  it("空でも落ちない", async () => {
    await expect(syncFeedingNotices([])).resolves.toBeUndefined();
  });
});
