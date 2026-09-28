import { describe, expect, it } from "vitest";
import { UpcomingTask } from "@/lib/breeding";
import { groupTasks } from "@/lib/taskGroups";

const task = (kind: UpcomingTask["kind"], id: string, overdue = false): UpcomingTask => ({
  id,
  kind,
  title: id,
  detail: "",
  overdue,
  dueDate: "2026-09-28",
  showFrom: "2026-09-28",
});

describe("groupTasks", () => {
  it("同じ種類をひとまとめにする", () => {
    const groups = groupTasks([
      task("bottle", "b1"),
      task("split", "s1"),
      task("bottle", "b2"),
    ]);
    expect(groups.map((g) => [g.kind, g.tasks.length])).toEqual([
      ["bottle", 2],
      ["split", 1],
    ]);
  });

  it("まとまりの中では、もとの並びを保つ", () => {
    const groups = groupTasks([task("bottle", "b1"), task("bottle", "b2")]);
    expect(groups[0].tasks.map((t) => t.id)).toEqual(["b1", "b2"]);
  });

  it("そろそろの件数を数える", () => {
    const groups = groupTasks([
      task("bottle", "b1", true),
      task("bottle", "b2"),
      task("bottle", "b3", true),
    ]);
    expect(groups[0].overdue).toBe(2);
  });

  it("急ぐまとまりほど前に出す", () => {
    const groups = groupTasks([
      task("bottle", "b1"),
      task("bottle", "b2"),
      task("bottle", "b3"),
      task("split", "s1", true),
    ]);
    // 件数は少なくても、そろそろのある割り出しが先
    expect(groups.map((g) => g.kind)).toEqual(["split", "bottle"]);
  });

  it("そろそろが同じなら、件数の多いほうが前", () => {
    const groups = groupTasks([task("bottle", "b1"), task("bottle", "b2"), task("split", "s1")]);
    expect(groups.map((g) => g.kind)).toEqual(["bottle", "split"]);
  });

  it("何も無ければ空", () => {
    expect(groupTasks([])).toEqual([]);
  });

  it("呼び名を付ける", () => {
    expect(groupTasks([task("digout", "d1")])[0].label).toBe("掘り出し");
  });
});
