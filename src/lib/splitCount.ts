/**
 * 割り出しのカウンター。
 *
 * 産卵セットを崩すときは、片手にスプーン、もう片方は土まみれで、出てきた卵と
 * 幼虫を数えながら掘る。あとで「何頭だったか」を思い出して打ち込むのは無理があり、
 * 途中で分からなくなる。その場で押して数えられるようにする。
 *
 * ## 数える段階を分ける
 *
 * 割り出しでは卵・初齢・2齢が混ざって出てくる。まとめて「20」と数えてしまうと、
 * あとから菌糸に入れる時期を決められない (卵は孵化を待つ、3齢はすぐ大きなビンへ)。
 *
 * ## 途中の数は端末に残す
 *
 * 20分かけて掘っているあいだに画面が消えたり、アプリが後ろへ回されたりする。
 * 数え直しになると心が折れるので、押すたびに残しておく。
 */
import { BreedingLine, Larva, LarvaStage } from "@/types";
import { generateId } from "@/lib/utils";

/** 割り出しで出てくる段階だけ。蛹や成虫はここでは出てこない */
export type SplitStage = Extract<LarvaStage, "egg" | "L1" | "L2" | "L3">;

export const SPLIT_STAGES: { stage: SplitStage; label: string; unit: string }[] = [
  { stage: "egg", label: "卵", unit: "個" },
  { stage: "L1", label: "初齢", unit: "頭" },
  { stage: "L2", label: "2齢", unit: "頭" },
  { stage: "L3", label: "3齢", unit: "頭" },
];

export type SplitTally = Record<SplitStage, number>;

export function emptyTally(): SplitTally {
  return { egg: 0, L1: 0, L2: 0, L3: 0 };
}

/** 卵も幼虫も合わせた数 */
export function tallyTotal(t: SplitTally): number {
  return SPLIT_STAGES.reduce((n, s) => n + t[s.stage], 0);
}

/** 幼虫だけの数 (ラインの「割り出し幼虫数」に入れるのはこちら) */
export function tallyLarvae(t: SplitTally): number {
  return t.L1 + t.L2 + t.L3;
}

/** 1つ足す・1つ戻す。0より下がらない */
export function bump(t: SplitTally, stage: SplitStage, by: number): SplitTally {
  return { ...t, [stage]: Math.max(0, t[stage] + by) };
}

/**
 * 次に使う番号。
 *
 * すでにある番号の最大に1を足す。**件数から出してはいけない** —
 * 途中で1頭消すと番号が戻り、同じ管理番号が2つできる。
 */
export function nextCodeNumber(lineName: string, existing: Larva[]): number {
  const head = `${lineName}-`;
  let max = 0;
  for (const l of existing) {
    if (!l.code.startsWith(head)) continue;
    const n = parseInt(l.code.slice(head.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

/**
 * 数えた結果から幼虫の記録を作る。
 * 番号は段階の順 (卵 → 初齢 → 2齢 → 3齢) に続けて振る
 */
export function buildSplitLarvae(
  line: BreedingLine,
  tally: SplitTally,
  date: string,
  existing: Larva[]
): Larva[] {
  let num = nextCodeNumber(line.name, existing);
  const out: Larva[] = [];

  for (const { stage } of SPLIT_STAGES) {
    for (let i = 0; i < tally[stage]; i++) {
      out.push({
        id: generateId(),
        code: `${line.name}-${String(num).padStart(2, "0")}`,
        lineId: line.id,
        species: line.species,
        stage,
        gender: "unknown",
        // 卵は孵化していないので、掘り出した日を孵化日にはしない
        hatchDate: stage === "egg" ? undefined : date,
        bottleChanges: [],
        isAlive: true,
        notes: "",
      });
      num++;
    }
  }
  return out;
}

/* ── 途中の数を端末に残す ── */

const DRAFT_KEY = "kuwa-split-draft";

export interface SplitDraft {
  lineId: string;
  tally: SplitTally;
  date: string;
}

export function saveDraft(draft: SplitDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // 残せなくても数えること自体は続けられる
  }
}

/** そのラインの途中の数。形が違えば無かったことにする */
export function loadDraft(lineId: string): SplitDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as unknown;
    if (typeof d !== "object" || d === null) return null;
    const draft = d as Partial<SplitDraft>;
    if (draft.lineId !== lineId || typeof draft.date !== "string") return null;
    const tally = emptyTally();
    const got = draft.tally as Partial<SplitTally> | undefined;
    if (!got) return null;
    for (const { stage } of SPLIT_STAGES) {
      const n = got[stage];
      if (typeof n === "number" && Number.isFinite(n) && n >= 0) tally[stage] = Math.floor(n);
    }
    return tallyTotal(tally) > 0 ? { lineId, tally, date: draft.date } : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* 消せなくても、次に開いたラインが違えば読まれない */
  }
}
