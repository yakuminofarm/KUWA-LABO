import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Beetle,
  BottleChange,
  BreedingLine,
  Expense,
  Larva,
  ReminderSettings,
  ScheduleSettings,
} from "@/types";
import { DEFAULT_SCHEDULE, headCount, needsFeeding, todayStr } from "@/lib/breeding";
import { isBuiltInSpecies } from "@/lib/customSpecies";
import type { SpeciesOverrides, TuningPatch } from "@/lib/speciesTuning";
import { generateId } from "@/lib/utils";
import { mockBeetles, mockExpenses, mockLarvae, mockLines } from "@/lib/mockData";
import type { BackupData, ImportResult } from "@/lib/backup";

/** 引き上げ時に人が確かめて決める項目 (幼虫の記録からは埋まらないもの) */
export interface PromoteDetails {
  code: string;
  name?: string;
  gender: Beetle["gender"];
  sizeMm?: number;
  locality?: string;
  generation?: string;
  matured?: boolean;
  notes?: string;
}

interface KuwagataStore {
  beetles: Beetle[];
  lines: BreedingLine[];
  larvae: Larva[];
  expenses: Expense[];

  addBeetle: (beetle: Beetle) => void;
  /** ペアで迎えた2頭を、互いを指した状態でまとめて迎える */
  addBeetlePair: (male: Beetle, female: Beetle) => void;
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

  /** 育成の目安にする日数 (飼育者ごとに変えられる) */
  schedule: ScheduleSettings;
  setSchedule: (s: Partial<ScheduleSettings>) => void;
  /**
   * 品種ごとに直した値。AIの目安は書き込まず、本人が直したものだけ入れる。
   * 目安まで写すと、あとで目安を直しても古い値が残り、どれが本人の決めた値かも
   * 分からなくなる (src/lib/speciesTuning.ts)
   */
  speciesTuning: SpeciesOverrides;
  /**
   * 自分で足した品種。組み込みの一覧に無いものを、毎回打たずに選べるようにする
   * (src/lib/customSpecies.ts)
   */
  customSpecies: string[];
  addCustomSpecies: (name: string) => void;
  removeCustomSpecies: (name: string) => void;
  /**
   * 品種の名前を直す。**記録のほうもまとめて付け替える。**
   * 名前だけ直しても、その記録が古い名前のまま取り残される
   */
  renameSpecies: (from: string, to: string) => number;
  /**
   * 登録しておく管理系統 (25OK-A など)。使ったことのある系統は記録から
   * 分かるので、ここに入るのは**まだ使っていない系統**だけ
   * (src/lib/codeSeries.ts)
   */
  codeSeries: string[];
  addCodeSeries: (name: string) => void;
  removeCodeSeries: (name: string) => void;
  /**
   * ホームで畳んでいる節。
   * 端末ごとの見た目の好みなので、控え (バックアップ) には入れない
   */
  foldedHome: string[];
  toggleHomeSection: (id: string) => void;
  setSpeciesTuning: (species: string, patch: TuningPatch) => void;
  /** その品種をAIの目安に戻す */
  clearSpeciesTuning: (species: string) => void;

  /** 最後にバックアップを書き出した日時 (ISO)。まだ一度もしていなければ未設定 */
  lastBackupAt?: string;
  /** バックアップの書き出し・コピーが成功したときに呼ぶ */
  recordBackup: () => void;

  addLine: (line: BreedingLine) => void;
  updateLine: (id: string, updates: Partial<BreedingLine>) => void;
  deleteLine: (id: string) => void;
  getLine: (id: string) => BreedingLine | undefined;

  addLarva: (larva: Larva) => void;
  /**
   * 羽化した幼虫を成虫台帳へ引き上げる。
   * 幼虫レコードは残したまま相互にリンクする — 育成の履歴を失わないため、
   * また費用は幼虫側で集計しているので、成虫に写すと二重計上になるため。
   * すでに引き上げずみなら何もせず undefined を返す。
   */
  promoteLarva: (larvaId: string, details: PromoteDetails) => Beetle | undefined;
  /**
   * まとまりから1頭を切り出して別レコードにする。
   * 切り出した側の id を返す。1頭しかないまとまりでは何もしない。
   */
  splitLarva: (larvaId: string) => string | undefined;
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

  /** 見本の記録を入れる (どんなアプリか試したい人向け) */
  loadSample: () => void;
  /** 見本として入れた記録だけをまとめて消す */
  clearSample: () => number;
  /** 見本の記録が残っているか */
  hasSample: () => boolean;
  /** 記録も設定もすべて捨てて、初めて開いた状態に戻す */
  resetAll: () => void;

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
      // 初期状態は空。見本は本人が望んだときだけ入れる
      beetles: [],
      lines: [],
      larvae: [],
      expenses: [],
      reminder: { enabled: false, time: "19:00", intervalDays: 1, foodType: "プロゼリー", showCost: true },
      schedule: { ...DEFAULT_SCHEDULE },
      speciesTuning: {},
      customSpecies: [],
      codeSeries: [],
      foldedHome: [],
      lastBackupAt: undefined,

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
        const { intervalDays } = get().reminder;
        const tuning = get().speciesTuning;
        const due = new Set(
          get()
            .beetles.filter((b) => needsFeeding(b, intervalDays, today, tuning))
            .map((b) => b.id)
        );
        set((s) => ({
          beetles: s.beetles.map((b) =>
            due.has(b.id) ? { ...b, lastFedDate: today } : b
          ),
        }));
        return due.size;
      },

      setReminder: (r) => set((s) => ({ reminder: { ...s.reminder, ...r } })),

      setSchedule: (v) => set((s) => ({ schedule: { ...s.schedule, ...v } })),

      addCustomSpecies: (name) =>
        set((s) =>
          s.customSpecies.includes(name) ? s : { customSpecies: [...s.customSpecies, name] }
        ),

      // 名前を消しても、その品種の記録には触らない。
      // 選択肢から外すだけなので、残っている記録は今までどおり動く
      removeCustomSpecies: (name) =>
        set((s) => ({ customSpecies: s.customSpecies.filter((x) => x !== name) })),

      renameSpecies: (from, to) => {
        let moved = 0;
        set((s) => {
          const swap = <T extends { species: string }>(list: T[]) =>
            list.map((x) => {
              if (x.species !== from) return x;
              moved++;
              return { ...x, species: to };
            });
          // 目安は名前で持っているので、一緒に付け替える。
          // 行き先にすでに目安があれば、そちらを残す (まとめる側を優先)
          const tuning = { ...s.speciesTuning };
          if (tuning[from] != null) {
            if (tuning[to] == null) tuning[to] = tuning[from];
            delete tuning[from];
          }
          return {
            beetles: swap(s.beetles),
            larvae: swap(s.larvae),
            lines: swap(s.lines),
            speciesTuning: tuning,
            // 組み込みの名前へまとめたときは、足した品種としては持たない
            customSpecies: [
              ...new Set(
                s.customSpecies
                  .filter((x) => x !== from)
                  .concat(isBuiltInSpecies(to) ? [] : [to])
              ),
            ],
          };
        });
        return moved;
      },

      toggleHomeSection: (id) =>
        set((s) => ({
          foldedHome: s.foldedHome.includes(id)
            ? s.foldedHome.filter((x) => x !== id)
            : [...s.foldedHome, id],
        })),

      addCodeSeries: (name) =>
        set((s) => (s.codeSeries.includes(name) ? s : { codeSeries: [...s.codeSeries, name] })),

      // 名前を消しても、その系統の管理番号には触らない。
      // 選ぶときの一覧から外すだけ
      removeCodeSeries: (name) =>
        set((s) => ({ codeSeries: s.codeSeries.filter((x) => x !== name) })),

      setSpeciesTuning: (species, patch) =>
        set((s) => ({
          speciesTuning: {
            ...s.speciesTuning,
            [species]: { ...s.speciesTuning[species], ...patch },
          },
        })),

      clearSpeciesTuning: (species) =>
        set((s) => {
          const next = { ...s.speciesTuning };
          delete next[species];
          return { speciesTuning: next };
        }),

      recordBackup: () => set({ lastBackupAt: new Date().toISOString() }),

      addBeetle: (beetle) => set((s) => ({ beetles: [...s.beetles, beetle] })),

      addBeetlePair: (male, female) =>
        set((s) => ({ beetles: [...s.beetles, male, female] })),

      updateBeetle: (id, updates) =>
        set((s) => ({
          beetles: s.beetles.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),

      // 相手が消えたのに ペア の印だけ残ると、居ない個体を指したままになる
      deleteBeetle: (id) =>
        set((s) => ({
          beetles: s.beetles
            .filter((b) => b.id !== id)
            .map((b) => (b.pairId === id ? { ...b, pairId: undefined } : b)),
        })),

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

      promoteLarva: (larvaId, details) => {
        const s = get();
        const larva = s.larvae.find((l) => l.id === larvaId);
        if (!larva) return undefined;
        // 二重登録を防ぐ。ただし成虫側が消されている場合は登録し直せるようにする
        if (larva.promotedBeetleId && s.beetles.some((b) => b.id === larva.promotedBeetleId)) {
          return undefined;
        }
        // まとまりのまま引き上げると、残りの頭数の行方が分からなくなる
        if (headCount(larva) > 1) return undefined;

        const beetle: Beetle = {
          id: generateId(),
          code: details.code.trim(),
          name: details.name?.trim() || undefined,
          species: larva.species,
          locality: details.locality?.trim() || undefined,
          generation: details.generation?.trim() || undefined,
          gender: details.gender,
          sizeMm: details.sizeMm,
          emergedDate: larva.emergedDate,
          // 掘り出した日をもって手元の成虫として数える (未掘り出しなら羽化日)
          acquiredDate: larva.dugOutDate ?? larva.emergedDate ?? todayStr(),
          // priceYen は入れない。育成費用は幼虫レコードから集計しており、
          // ここに写すと総支出が二重に膨らむ
          matured: details.matured ?? false,
          sourceLineId: larva.lineId,
          sourceLarvaId: larva.id,
          // 幼虫のときの写真をそのまま1枚目にする (同じ写真を指すだけ)
          photoIds: larva.photoId ? [larva.photoId] : undefined,
          isAlive: true,
          notes: details.notes?.trim() ?? "",
        };

        set((st) => ({
          beetles: [...st.beetles, beetle],
          larvae: st.larvae.map((l) =>
            l.id === larvaId ? { ...l, promotedBeetleId: beetle.id } : l
          ),
        }));
        return beetle;
      },

      splitLarva: (larvaId) => {
        const s = get();
        const larva = s.larvae.find((l) => l.id === larvaId);
        if (!larva || headCount(larva) <= 1) return undefined;

        const id = generateId();
        // 費用は元のまとまりに残す。分けて写すと、ビン交換の記録と
        // 金額の対応が崩れるうえ、総支出も合わなくなる
        const one: Larva = {
          ...larva,
          id,
          code: `${larva.code}-${headCount(larva)}`,
          count: 1,
          priceYen: undefined,
          bottleChanges: [],
          promotedBeetleId: undefined,
        };

        set((st) => ({
          larvae: [
            ...st.larvae.map((l) =>
              l.id === larvaId ? { ...l, count: headCount(l) - 1 } : l
            ),
            one,
          ],
        }));
        return id;
      },

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

      loadSample: () =>
        set((st) => ({
          beetles: [...st.beetles, ...mockBeetles],
          lines: [...st.lines, ...mockLines],
          larvae: [...st.larvae, ...mockLarvae],
          expenses: [...st.expenses, ...mockExpenses],
        })),

      clearSample: () => {
        const s0 = get();
        const n =
          s0.beetles.filter((x) => x.isSample).length +
          s0.lines.filter((x) => x.isSample).length +
          s0.larvae.filter((x) => x.isSample).length +
          s0.expenses.filter((x) => x.isSample).length;
        set((st) => ({
          beetles: st.beetles.filter((x) => !x.isSample),
          lines: st.lines.filter((x) => !x.isSample),
          larvae: st.larvae.filter((x) => !x.isSample),
          expenses: st.expenses.filter((x) => !x.isSample),
        }));
        return n;
      },

      hasSample: () => {
        const s0 = get();
        return (
          s0.beetles.some((x) => x.isSample) ||
          s0.lines.some((x) => x.isSample) ||
          s0.larvae.some((x) => x.isSample) ||
          s0.expenses.some((x) => x.isSample)
        );
      },

      resetAll: () =>
        set({
          beetles: [],
          lines: [],
          larvae: [],
          expenses: [],
          reminder: { enabled: false, time: "19:00", intervalDays: 1, foodType: "プロゼリー", showCost: true },
          schedule: { ...DEFAULT_SCHEDULE },
          speciesTuning: {},
          customSpecies: [],
          codeSeries: [],
          lastBackupAt: undefined,
        }),

      snapshot: () => {
        const s = get();
        return {
          beetles: s.beetles,
          lines: s.lines,
          larvae: s.larvae,
          expenses: s.expenses,
          // 設定も控えに入れる。機種を変えたときに、記録だけ戻って
          // 目安を入れ直す羽目にならないように
          reminder: s.reminder,
          schedule: s.schedule,
          speciesTuning: s.speciesTuning,
          customSpecies: s.customSpecies,
          codeSeries: s.codeSeries,
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
          schedule: d.schedule ?? s.schedule,
          speciesTuning: d.speciesTuning ?? s.speciesTuning,
          customSpecies: d.customSpecies ?? s.customSpecies,
          codeSeries: d.codeSeries ?? s.codeSeries,
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
          // 設定は上書きしないが、品種の名前だけは足す。
          // 取り込んだ記録の品種が選べないままだと、直すときに困る
          customSpecies: [...new Set([...s.customSpecies, ...(d.customSpecies ?? [])])],
          codeSeries: [...new Set([...s.codeSeries, ...(d.codeSeries ?? [])])],
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
          // 空配列も「消した結果」として尊重する。件数で判断すると
          // 全部消した人に見本が戻ってきてしまう
          beetles: p?.beetles ?? current.beetles,
          lines: p?.lines ?? current.lines,
          larvae: p?.larvae ?? current.larvae,
          expenses: p?.expenses ?? current.expenses,
          // 設定は項目が増えることがあるので、保存済みの値を既定に重ねる
          reminder: { ...current.reminder, ...(p?.reminder ?? {}) },
          schedule: { ...current.schedule, ...(p?.schedule ?? {}) },
          speciesTuning: p?.speciesTuning ?? current.speciesTuning,
          customSpecies: p?.customSpecies ?? current.customSpecies,
          codeSeries: p?.codeSeries ?? current.codeSeries,
          foldedHome: p?.foldedHome ?? current.foldedHome,
          lastBackupAt: p?.lastBackupAt ?? current.lastBackupAt,
        };
      },
    }
  )
);
