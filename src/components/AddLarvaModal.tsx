"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { Gender, Larva, LarvaStage } from "@/types";
import { SPECIES_OPTIONS, STAGE_LABELS } from "@/lib/breeding";
import { generateId } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { PhotoPicker } from "@/components/KuwaUI";

interface AddLarvaModalProps {
  onClose: () => void;
}

const inputCls =
  "kuwa-input";

export function AddLarvaModal({ onClose }: AddLarvaModalProps) {
  const { lines, addLarva } = useKuwagataStore();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    code: "",
    lineId: "",
    species: "オオクワガタ",
    customSpecies: "",
    stage: "L1" as LarvaStage,
    gender: "unknown" as Gender,
    hatchDate: new Date().toISOString().split("T")[0],
    priceYen: "",
    notes: "",
  });
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();

  const canSubmit = form.code.trim() !== "";

  const handleLineChange = (lineId: string) => {
    const line = lines.find((l) => l.id === lineId);
    setForm({
      ...form,
      lineId,
      species: line ? line.species : form.species,
    });
  };

  const handleSubmit = () => {
    if (!canSubmit || submitting || done) return;
    setSubmitting(true);
    const species =
      form.species === "その他" ? form.customSpecies || "その他" : form.species;
    const larva: Larva = {
      id: generateId(),
      code: form.code.trim(),
      lineId: form.lineId || undefined,
      species,
      stage: form.stage,
      gender: form.gender,
      hatchDate: form.hatchDate || undefined,
      priceYen: form.priceYen ? parseInt(form.priceYen) : undefined,
      bottleChanges: [],
      photoUrl,
      isAlive: true,
      notes: form.notes,
    };
    addLarva(larva);
    setDone(true);
    showToast(`${larva.code} を登録しました！`);
    setTimeout(() => onClose(), 800);
  };

  const stageOptions: LarvaStage[] = ["egg", "L1", "L2", "L3", "prepupa", "pupa"];

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(36,26,17,0.55)" }}>
      <div className="kuwa-sheet w-full max-w-md mx-auto max-h-[90vh] flex flex-col">
        <div className="kuwa-sheet-bar sticky top-0 px-5 py-4 flex items-center justify-between flex-shrink-0 rounded-t-[24px]">
          <h2 className="text-lg font-bold text-[#31241a]">幼虫を登録</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#e6dbc6]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pt-5 space-y-4">
          <PhotoPicker value={photoUrl} onChange={setPhotoUrl} label="この子の写真" />

          <div>
            <label className="block text-sm font-medium text-[#40352a] mb-1">管理番号 *</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="例: 2026-A-13"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#40352a] mb-1">出身ライン</label>
            <select
              value={form.lineId}
              onChange={(e) => handleLineChange(e.target.value)}
              className={inputCls}
            >
              <option value="">なし (単独購入など)</option>
              {lines.map((l) => (
                <option key={l.id} value={l.id}>{l.name} ({l.species})</option>
              ))}
            </select>
          </div>

          {!form.lineId && (
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">種類</label>
              <select
                value={form.species}
                onChange={(e) => setForm({ ...form, species: e.target.value })}
                className={inputCls}
              >
                {SPECIES_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {form.species === "その他" && (
                <input
                  value={form.customSpecies}
                  onChange={(e) => setForm({ ...form, customSpecies: e.target.value })}
                  placeholder="種類名を入力"
                  className={`mt-2 ${inputCls}`}
                />
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#40352a] mb-1">ステージ</label>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {stageOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({ ...form, stage: s })}
                  className={`flex-1 min-w-[52px] py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    form.stage === s
                      ? "bg-[#55682f] text-[#fdf6e7] border-[#55682f]"
                      : "border-[rgba(107,68,35,0.16)] text-[#77644b]"
                  }`}
                >
                  {STAGE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">孵化 / 割出日</label>
              <input
                type="date"
                value={form.hatchDate}
                onChange={(e) => setForm({ ...form, hatchDate: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">雌雄</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}
                className={inputCls}
              >
                <option value="unknown">不明</option>
                <option value="male">♂ オス</option>
                <option value="female">♀ メス</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#40352a] mb-1">入手金額 (円)</label>
            <input
              type="number"
              min="0"
              value={form.priceYen}
              onChange={(e) => setForm({ ...form, priceYen: e.target.value })}
              placeholder="購入幼虫の場合 (収支管理に反映)"
              className={inputCls}
            />
          </div>

          <div className="pb-4">
            <label className="block text-sm font-medium text-[#40352a] mb-1">メモ</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="購入元・特記事項など"
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>
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
