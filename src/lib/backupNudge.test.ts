import { describe, expect, it } from "vitest";
import { backupNudge, nudgeText } from "@/lib/backupNudge";

/** days 日前の日付 */
function ago(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

describe("backupNudge", () => {
  it("始めたばかりの人には出さない", () => {
    // 数件で毎回うるさく言われると、大事なときに読み飛ばされる
    expect(backupNudge(4, undefined).level).toBe("none");
    expect(backupNudge(4, ago(365)).level).toBe("none");
  });

  it("1度も書き出していなければ、そっと促す", () => {
    const n = backupNudge(10, undefined);
    expect(n.level).toBe("soft");
    expect(n.days).toBeNull();
  });

  it("1度も書き出さないまま記録がたまったら、強く促す", () => {
    expect(backupNudge(20, undefined).level).toBe("hard");
  });

  it("書き出してすぐなら出さない", () => {
    expect(backupNudge(50, ago(3)).level).toBe("none");
  });

  it("2週間たったらそっと促す", () => {
    const n = backupNudge(50, ago(20));
    expect(n.level).toBe("soft");
    expect(n.days).toBe(20);
  });

  it("45日たったら強く促す", () => {
    expect(backupNudge(50, ago(60)).level).toBe("hard");
  });
});

describe("nudgeText", () => {
  it("何件が、何日ぶん控えに入っていないかを出す", () => {
    expect(nudgeText(backupNudge(32, ago(42)))).toBe(
      "32件の記録。控えを書き出してから42日たちました"
    );
  });

  it("1度も書き出していないときは、そう言う", () => {
    expect(nudgeText(backupNudge(32, undefined))).toBe("32件の記録が、まだ控えに入っていません");
  });
});
