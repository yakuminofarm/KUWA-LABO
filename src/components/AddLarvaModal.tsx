"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { Larva } from "@/types";
import { generateId } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { PhotoPicker } from "@/components/KuwaUI";
import {
  LarvaFields,
  LarvaFormState,
  emptyLarvaForm,
  formToLarva,
  isLarvaFormValid,
} from "@/components/LarvaFields";

interface AddLarvaModalProps {
  onClose: () => void;
}

export function AddLarvaModal({ onClose }: AddLarvaModalProps) {
  const addLarva = useKuwagataStore((s) => s.addLarva);
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState<LarvaFormState>(emptyLarvaForm);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();

  const canSubmit = isLarvaFormValid(form);

  const handleSubmit = () => {
    if (!canSubmit || submitting || done) return;
    setSubmitting(true);
    const larva: Larva = {
      id: generateId(),
      ...formToLarva(form),
      bottleChanges: [],
      photoUrl,
      isAlive: true,
    };
    addLarva(larva);
    setDone(true);
    showToast(`${larva.code} を登録しました！`);
    setTimeout(() => onClose(), 800);
  };


  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(36,26,17,0.55)" }}>
      <div className="kuwa-sheet w-full max-w-md mx-auto max-h-[90vh] flex flex-col">
        <div className="kuwa-sheet-bar sticky top-0 px-5 py-4 flex items-center justify-between flex-shrink-0 rounded-t-[24px]">
          <h2 className="text-lg font-bold text-[#31241a]">幼虫を登録</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#e6dbc6]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="kuwa-sheet-body flex-1 px-5 pt-5 space-y-4">
          <PhotoPicker value={photoUrl} onChange={setPhotoUrl} label="この子の写真" />

          <LarvaFields form={form} onChange={setForm} />
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
                : "bg-[#55682f] hover:bg-[#475827] active:scale-[0.98] text-[#fdf6e7]"
            }`}
          >
            {done ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                登録できました！
              </>
            ) : submitting ? (
              "登録しています…"
            ) : (
              "登録する"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
