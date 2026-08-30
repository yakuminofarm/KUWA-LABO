"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { Beetle } from "@/types";
import { formatYen, splitPairAmount } from "@/lib/breeding";
import { generateId } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { PhotoPicker } from "@/components/KuwaUI";
import {
  BeetleFields,
  BeetleFormState,
  PairMemberFields,
  PairMemberState,
  emptyBeetleForm,
  emptyPairMember,
  formToBeetle,
  isBeetleFormValid,
  nextCode,
} from "@/components/BeetleFields";

interface AddBeetleModalProps {
  onClose: () => void;
  /** 複製のとき、あらかじめ埋めておく内容 */
  initial?: BeetleFormState;
}

type Mode = "single" | "pair";

export function AddBeetleModal({ onClose, initial }: AddBeetleModalProps) {
  const addBeetle = useKuwagataStore((s) => s.addBeetle);
  const addBeetlePair = useKuwagataStore((s) => s.addBeetlePair);
  const beetles = useKuwagataStore((s) => s.beetles);
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState<Mode>("single");
  const [form, setForm] = useState<BeetleFormState>(initial ?? emptyBeetleForm);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [male, setMale] = useState<PairMemberState>(emptyPairMember);
  const [female, setFemale] = useState<PairMemberState>(emptyPairMember);
  // ♀の番号は♂の続きを下書きする。自分で直したあとは、もう触らない
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
    setMale(next);
    if (femaleEdited) return;
    setFemale((f) => ({
      ...f,
      code: nextCode(next.code.trim(), beetles.map((b) => b.code)),
    }));
  };

  const handleSubmit = () => {
    if (!canSubmit || submitting || done) return;
    setSubmitting(true);

    if (!pair) {
      const beetle: Beetle = {
        id: generateId(),
        ...formToBeetle(form),
        photoUrl,
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
              <PairMemberFields gender="male" form={male} onChange={onMaleChange} />
              <PairMemberFields
                gender="female"
                form={female}
                onChange={(f) => {
                  setFemaleEdited(true);
                  setFemale(f);
                }}
              />
            </>
          ) : (
            <PhotoPicker value={photoUrl} onChange={setPhotoUrl} label="この子の写真" />
          )}

          <BeetleFields
            form={form}
            onChange={setForm}
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
  );
}
