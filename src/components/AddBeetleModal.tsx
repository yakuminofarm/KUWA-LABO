"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { Beetle } from "@/types";
import { formatYen, splitPairAmount } from "@/lib/breeding";
import { generateId } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { PhotoPickerMulti, Portal } from "@/components/KuwaUI";
import {
  BeetleFields,
  BeetleFormState,
  PairMemberFields,
  PairMemberState,
  emptyBeetleForm,
  emptyPairMember,
  formSpecies,
  formToBeetle,
  isBeetleFormValid,
  speciesFields,
} from "@/components/BeetleFields";
import { nextCode, suggestCode } from "@/lib/beetleCode";
import { useSpeciesOptions } from "@/store/useSpeciesOptions";

interface AddBeetleModalProps {
  onClose: () => void;
  /** 複製のとき、あらかじめ埋めておく内容 */
  initial?: BeetleFormState;
}

type Mode = "single" | "pair";

/**
 * 登録画面をどこから始めるか。
 *
 * **前に登録した子と同じ品種から始める。** 続けて登録するときはたいてい
 * 同じ品種だし、いつもオオクワガタから始まると、その品種を飼っていない人には
 * 番号の下書きも出てこない (下書きは同じ品種の続きしか出さないため)。
 */
function startForm(
  beetles: readonly { code: string; species: string }[],
  speciesOptions: readonly string[]
): BeetleFormState {
  const last = beetles[beetles.length - 1]?.species;
  const form = {
    ...emptyBeetleForm(),
    ...(last ? speciesFields(last, speciesOptions) : {}),
  };
  return { ...form, code: suggestCode(beetles, formSpecies(form)) };
}

export function AddBeetleModal({ onClose, initial }: AddBeetleModalProps) {
  const addBeetle = useKuwagataStore((s) => s.addBeetle);
  const addBeetlePair = useKuwagataStore((s) => s.addBeetlePair);
  const beetles = useKuwagataStore((s) => s.beetles);
  const speciesOptions = useSpeciesOptions();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState<Mode>("single");
  const codes = beetles.map((b) => b.code);
  // 開いた時点で、前に登録した品種と、その続きの番号を入れておく。
  // 打ち直しは要らず、違うならそのまま書き換えられる。
  // 開いているあいだ変わらない下書きなので、はじめに1回だけ出す
  const [draft] = useState<BeetleFormState>(
    () => initial ?? startForm(beetles, speciesOptions)
  );
  const [form, setForm] = useState<BeetleFormState>(draft);
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [male, setMale] = useState<PairMemberState>(() => ({
    ...emptyPairMember(),
    code: draft.code,
  }));
  // ♀ は ♂ の続き。ここで入れておかないと、♂ を打ち直すまで空のままになる
  const [female, setFemale] = useState<PairMemberState>(() => ({
    ...emptyPairMember(),
    code: nextCode(draft.code, codes),
  }));
  // 下書きを自分で直したあとは、こちらから書き換えない
  const [codeEdited, setCodeEdited] = useState(() => (initial?.code ?? "") !== "");
  const [maleEdited, setMaleEdited] = useState(false);
  const [femaleEdited, setFemaleEdited] = useState(false);

  const pair = mode === "pair";
  const total = form.priceYen ? parseInt(form.priceYen, 10) : undefined;
  const [malePrice, femalePrice] =
    total != null ? splitPairAmount(total) : [undefined, undefined];

  const canSubmit = pair
    ? male.code.trim() !== "" && female.code.trim() !== "" && form.acquiredDate !== ""
    : isBeetleFormValid(form);

  /** ♂の番号を入れたら、♀は続き番号を下書きしておく */
  const onMaleChange = (next: PairMemberState) => {
    if (next.code !== male.code) setMaleEdited(true);
    setMale(next);
    if (femaleEdited) return;
    const draft = nextCode(next.code.trim(), codes);
    // ♂ の番号を打ち直している途中は、続きを出しようがない。
    // ここで空にすると、♀ の系統まで消えてしまう
    if (draft !== "") setFemale((f) => ({ ...f, code: draft }));
  };

  /**
   * 品種が変わったら、番号の下書きも引き直す。
   * 品種ごとに記号を変えている人に、別の品種の続きを出したままにしないため。
   */
  const onFormChange = (next: BeetleFormState) => {
    if (next.code !== form.code) setCodeEdited(true);

    const speciesChanged = formSpecies(next) !== formSpecies(form);
    if (!speciesChanged) {
      setForm(next);
      return;
    }

    const nextDraft = suggestCode(beetles, formSpecies(next));
    setForm(codeEdited ? next : { ...next, code: nextDraft });
    if (maleEdited) return;
    setMale((m) => ({ ...m, code: nextDraft }));
    if (!femaleEdited) setFemale((f) => ({ ...f, code: nextCode(nextDraft, codes) }));
  };

  const handleSubmit = () => {
    if (!canSubmit || submitting || done) return;
    setSubmitting(true);

    if (!pair) {
      const beetle: Beetle = {
        id: generateId(),
        ...formToBeetle(form),
        photoIds: photoIds.length > 0 ? photoIds : undefined,
        isAlive: true,
      };
      addBeetle(beetle);
      setDone(true);
      showToast(`${beetle.code} を迎えました！`);
      setTimeout(() => onClose(), 800);
      return;
    }

    // 種類・産地・累代・入手日・メモはペアで同じ。金額だけ2頭に割り振る
    const shared = formToBeetle(form);
    const maleId = generateId();
    const femaleId = generateId();
    const own = (m: PairMemberState) => ({
      code: m.code.trim(),
      name: m.name.trim() || undefined,
      sizeMm: m.sizeMm ? parseFloat(m.sizeMm) : undefined,
      emergedDate: m.emergedDate || undefined,
      emergedDatePrecision: m.emergedDate ? m.emergedDatePrecision : undefined,
    });
    addBeetlePair(
      {
        ...shared,
        ...own(male),
        id: maleId,
        gender: "male",
        priceYen: malePrice,
        pairId: femaleId,
        isAlive: true,
      },
      {
        ...shared,
        ...own(female),
        id: femaleId,
        gender: "female",
        priceYen: femalePrice,
        pairId: maleId,
        isAlive: true,
      }
    );
    setDone(true);
    showToast(`${male.code.trim()} と ${female.code.trim()} を迎えました！`);
    setTimeout(() => onClose(), 800);
  };

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(36,26,17,0.55)" }}>
      <div className="kuwa-sheet w-full max-w-md mx-auto max-h-[90vh] flex flex-col">
        <div className="kuwa-sheet-bar sticky top-0 px-5 py-4 flex items-center justify-between flex-shrink-0 rounded-t-[24px]">
          <h2 className="text-lg font-bold text-[#31241a]">成虫を登録</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#e6dbc6]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="kuwa-sheet-body flex-1 px-5 pt-5 space-y-4">
          {/* 店頭ではペアで買うことが多い。1頭ずつ入れ直さずに済むように */}
          <div className="flex gap-2">
            {([
              { value: "single", label: "1頭で登録" },
              { value: "pair", label: "ペアで登録" },
            ] as const).map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors min-h-[44px] ${
                  mode === m.value
                    ? "bg-[#6b4423] text-[#fdf6e7] border-[#6b4423]"
                    : "border-[rgba(107,68,35,0.16)] text-[#77644b]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {pair ? (
            <>
              <PairMemberFields
                gender="male"
                form={male}
                onChange={onMaleChange}
              />
              <PairMemberFields
                gender="female"
                form={female}
                onChange={(f) => {
                  setFemaleEdited(true);
                  setFemale(f);
                }}
                codeHint={
                  !femaleEdited && female.code ? (
                    <p className="text-[11px] mt-1" style={{ color: "var(--kuwa-ink-soft)" }}>
                      ♂ の続きの番号です
                    </p>
                  ) : undefined
                }
              />
            </>
          ) : (
            <PhotoPickerMulti value={{ photoIds }} onChange={setPhotoIds} label="この子の写真" />
          )}

          <BeetleFields
            form={form}
            onChange={onFormChange}
            showIdentity={!pair}
            priceLabel={pair ? "入手金額 (ペアの合計・税込)" : undefined}
            priceHint={
              pair && total != null ? (
                <p className="text-[11px] mt-1" style={{ color: "var(--kuwa-ink-soft)" }}>
                  ♂ {formatYen(malePrice!)} ／ ♀ {formatYen(femalePrice!)} に分けて記録します
                </p>
              ) : undefined
            }
          />
        </div>

        <div className="kuwa-sheet-foot flex-shrink-0 px-5 pt-4 pb-safe-lg">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting || done}
            className={`w-full font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-base min-h-[52px] ${
              done
                ? "bg-[#55682f] text-[#fdf6e7] animate-kuwa-pop"
                : !canSubmit
                ? "bg-[#d8c9ae] text-[#8b7a64]"
                : "bg-[#6b4423] hover:bg-[#5a381c] active:scale-[0.98] text-[#fdf6e7]"
            }`}
          >
            {done ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                登録できました！
              </>
            ) : submitting ? (
              "登録しています…"
            ) : pair ? (
              "2頭まとめて登録する"
            ) : (
              "登録する"
            )}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}
