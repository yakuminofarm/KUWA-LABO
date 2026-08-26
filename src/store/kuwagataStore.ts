import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Beetle, BottleChange, BreedingLine, Expense, Larva, ReminderSettings } from "@/types";
import { todayStr } from "@/lib/breeding";
import { mockBeetles, mockExpenses, mockLarvae, mockLines } from "@/lib/mockData";
import type { BackupData, ImportResult } from "@/lib/backup";

interface KuwagataStore {
  beetles: Beetle[];
  lines: BreedingLine[];
  larvae: Larva[];
  expenses: Expense[];

  addBeetle: (beetle: Beetle) => void;
  updateBeetle: (id: string, updates: Partial<Beetle>) => void;
  deleteBeetle: (id: string) => void;
  toggleFavorite: (id: string) => void;
  getBeetle: (id: string) => Beetle | undefined;
  /** 今日のエサやり完了 (もう一度押すと取り消し) */
  toggleFedToday: (id: string) => void;
  /** 未給餌の成虫にまとめて記録 */
  feedAllToday: () => number;

  reminder: ReminderSettings;
  setReminder: (r: Partial<ReminderSettings>) => void;

  addLine: (line: BreedingLine) => void;
  updateLine: (id: string, updates: Partial<BreedingLine>) => void;
  deleteLine: (id: string) => void;
  getLine: (id: string) => BreedingLine | undefined;

  addLarva: (larva: Larva) => void;
  updateLarva: (id: string, updates: Partial<Larva>) => void;
  deleteLarva: (id: string) => void;
  getLarva: (id: string) => Larva | undefined;
  addBottleChange: (larvaId: string, change: BottleChange) => void;
  updateBottleChange: (larvaId: string, changeId: string, updates: Partial<BottleChange>) => void;
  deleteBottleChange: (larvaId: string, changeId: string) => void;

  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  getLarvaeByLine: (lineId: string) => Larva[];

  /** 今の記録をまるごと取り出す (バックアップ書き出し用) */
  snapshot: () => BackupData;
  /** 今の記録を捨てて、読み込んだ内容に入れ替える */
  replaceAll: (d: BackupData) => ImportResult;
  /** 今の記録を残したまま、まだ無いものだけ足す */
  mergeAll: (d: BackupData) => ImportResult;
}

/** id が既にあるものは飛ばして、新しいものだけ返す */
function appendNew<T extends { id: string }>(
  current: T[],
  incoming: T[]
): { next: T[]; added: number; duplicated: number } {
  const known = new Set(current.map((x) => x.id));
  const fresh = incoming.filter((x) => !known.has(x.id));
  return {
    next: fresh.length ? [...current, ...fresh] : current,
    added: fresh.length,
    duplicated: incoming.length - fresh.length,
  };
}

export const useKuwagataStore = create<KuwagataStore>()(
  persist(
    (set, get) => ({
      beetles: mockBeetles,
      lines: mockLines,
      larvae: mockLarvae,
      expenses: mockExpenses,
      reminder: { enabled: false, time: "19:00" },

      toggleFedToday: (id) =>
        set((s) => {
          const today = todayStr();
          return {
            beetles: s.beetles.map((b) =>
              b.id === id
                ? { ...b, lastFedDate: b.lastFedDate === today ? undefined : today }
                : b
            ),
          };
        }),

      feedAllToday: () => {
        const today = todayStr();
        const pending = get().beetles.filter(
          (b) => b.isAlive && b.soldPriceYen == null && b.matured && b.lastFedDate !== today
        );
        set((s) => ({
          beetles: s.beetles.map((b) =>
            b.isAlive && b.soldPriceYen == null && b.matured && b.lastFedDate !== today
              ? { ...b, lastFedDate: today }
              : b
          ),
        }));
        return pending.length;
      },

      setReminder: (r) => set((s) => ({ reminder: { ...s.reminder, ...r } })),

      addBeetle: (beetle) => set((s) => ({ beetles: [...s.beetles, beetle] })),

      updateBeetle: (id, updates) =>
        set((s) => ({
          beetles: s.beetles.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),

      deleteBeetle: (id) =>
        set((s) => ({ beetles: s.beetles.filter((b) => b.id !== id) })),

      toggleFavorite: (id) =>
        set((s) => ({
          beetles: s.beetles.map((b) =>
            b.id === id ? { ...b, isFavorite: !b.isFavorite } : b
          ),
        })),

      getBeetle: (id) => get().beetles.find((b) => b.id === id),

      addLine: (line) => set((s) => ({ lines: [...s.lines, line] })),

      updateLine: (id, updates) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        })),

      deleteLine: (id) =>
        set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),

      getLine: (id) => get().lines.find((l) => l.id === id),

      addLarva: (larva) => set((s) => ({ larvae: [...s.larvae, larva] })),

      updateLarva: (id, updates) =>
        set((s) => ({
          larvae: s.larvae.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        })),

      deleteLarva: (id) =>
        set((s) => ({ larvae: s.larvae.filter((l) => l.id !== id) })),

      getLarva: (id) => get().larvae.find((l) => l.id === id),

      addBottleChange: (larvaId, change) =>
        set((s) => ({
          larvae: s.larvae.map((l) =>
            l.id === larvaId
              ? { ...l, bottleChanges: [...l.bottleChanges, change] }
              : l
          ),
        })),

      updateBottleChange: (larvaId, changeId, updates) =>
        set((s) => ({
          larvae: s.larvae.map((l) =>
            l.id === larvaId
              ? {
                  ...l,
                  bottleChanges: l.bottleChanges.map((c) =>
                    c.id === changeId ? { ...c, ...updates } : c
                  ),
                }
              : l
          ),
        })),

      deleteBottleChange: (larvaId, changeId) =>
        set((s) => ({
          larvae: s.larvae.map((l) =>
            l.id === larvaId
              ? { ...l, bottleChanges: l.bottleChanges.filter((c) => c.id !== changeId) }
              : l
          ),
        })),

      addExpense: (expense) => set((s) => ({ expenses: [...s.expenses, expense] })),

      updateExpense: (id, updates) =>
        set((s) => ({
          expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),

      deleteExpense: (id) =>
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

      getLarvaeByLine: (lineId) =>
        get().larvae.filter((l) => l.lineId === lineId),

      snapshot: () => {
        const s = get();
        return {
          beetles: s.beetles,
          lines: s.lines,
          larvae: s.larvae,
          expenses: s.expenses,
          reminder: s.reminder,
        };
      },

      replaceAll: (d) => {
        const replaced =
          get().beetles.length +
          get().lines.length +
          get().larvae.length +
          get().expenses.length;
        set((s) => ({
          beetles: d.beetles,
          lines: d.lines,
          larvae: d.larvae,
          expenses: d.expenses,
          reminder: d.reminder ?? s.reminder,
        }));
        return {
          added: d.beetles.length + d.lines.length + d.larvae.length + d.expenses.length,
          duplicated: 0,
          replaced,
        };
      },

      mergeAll: (d) => {
        const s = get();
        const b = appendNew(s.beetles, d.beetles);
        const l = appendNew(s.lines, d.lines);
        const v = appendNew(s.larvae, d.larvae);
        const e = appendNew(s.expenses, d.expenses);
        set({
          beetles: b.next,
          lines: l.next,
          larvae: v.next,
          expenses: e.next,
        });
        return {
          added: b.added + l.added + v.added + e.added,
          duplicated: b.duplicated + l.duplicated + v.duplicated + e.duplicated,
          replaced: 0,
        };
      },
    }),
    {
      name: "kuwagata-storage",
      // localStorage が一杯 (写真の入れすぎ等) の場合に気づけるようにする
      storage: {
        getItem: (name) => {
          const v = localStorage.getItem(name);
          return v ? JSON.parse(v) : null;
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (e) {
            window.dispatchEvent(new CustomEvent("kuwa-storage-full"));
            throw e;
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<KuwagataStore>;
        return {
          ...current,
          beetles: p?.beetles?.length ? p.beetles : current.beetles,
          lines: p?.lines?.length ? p.lines : current.lines,
          larvae: p?.larvae?.length ? p.larvae : current.larvae,
          expenses: p?.expenses?.length ? p.expenses : current.expenses,
          reminder: p?.reminder ?? current.reminder,
        };
      },
    }
  )
);
