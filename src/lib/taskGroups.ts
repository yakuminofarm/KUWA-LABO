/**
 * やることリストのまとめ方。
 *
 * 幼虫が20頭いれば「ビン交換」の札が20枚並ぶ。同じ作業がずらりと続くと、
 * ほかの作業 (割り出し・掘り出し) が埋もれてしまう。
 * **同じ種類はひとまとめにして、開いたときだけ1件ずつ出す。**
 */
import { UpcomingTask } from "@/lib/breeding";

export type TaskKind = UpcomingTask["kind"];

/** まとめたときの呼び名。1件ずつの札は「2026-A-01 ビン交換」と個体名が付く */
export const TASK_KIND_LABEL: Record<TaskKind, string> = {
  set: "産卵セット投入",
  split: "割り出し",
  bottle: "ビン交換",
  emerge: "そろそろ羽化",
  digout: "掘り出し",
};

export interface TaskGroup {
  kind: TaskKind;
  label: string;
  tasks: UpcomingTask[];
  /** そろそろ (期限が来ている) の件数 */
  overdue: number;
}

/**
 * 種類ごとにまとめる。
 *
 * **急ぐまとまりほど前に出す** (そろそろの件数が多い順 → 件数が多い順)。
 * 元の並びは deriveUpcomingTasks が決めていて、まとまりの中ではそれを保つ。
 */
export function groupTasks(tasks: readonly UpcomingTask[]): TaskGroup[] {
  const byKind = new Map<TaskKind, UpcomingTask[]>();
  for (const t of tasks) {
    const list = byKind.get(t.kind) ?? [];
    list.push(t);
    byKind.set(t.kind, list);
  }

  return [...byKind.entries()]
    .map(([kind, list]) => ({
      kind,
      label: TASK_KIND_LABEL[kind],
      tasks: list,
      overdue: list.filter((t) => t.overdue).length,
    }))
    .sort((a, b) => b.overdue - a.overdue || b.tasks.length - a.tasks.length);
}
