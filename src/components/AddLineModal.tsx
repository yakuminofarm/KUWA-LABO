"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { BreedingLine } from "@/types";
import { generateId } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { SpeciesSelect } from "@/components/SpeciesSelect";

interface AddLineModalProps {
  onClose: () => void;
}

const inputCls =
  "kuwa-input";

export function AddLineModal({ onClose }: AddLineModalProps) {
  const { beetles, addLine } = useKuwagataStore();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "",
    species: "オオクワガタ",
    customSpecies: "",
    maleId: "",
    femaleId: "",
    pairingDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const males = beetles.filter((b) => b.gender === "male" && b.isAlive);
  const females = beetles.filter((b) => b.gender === "female" && b.isAlive);

  const canSubmit = form.name.trim() !== "";

  const handleSubmit = () => {
    if (!canSubmit || submitting || done) return;
    setSubmitting(true);
    const species =
      form.species === "その他" ? form.customSpecies || "その他" : form.species;
    const line: BreedingLine = {
      id: generateId(),
      name: form.name.trim(),
      species,
      maleId: form.maleId || undefined,
      femaleId: form.femaleId || undefined,
      pairingDate: form.pairingDate || undefined,
      status: "pairing",
      notes: form.notes,
    };
    addLine(line);
    setDone(true);
    showToast(`ライン ${line.name} ができました！`);
    setTimeout(() => onClose(), 800);
  };

  const beetleLabel = (id: string) => {
    const b = beetles.find((x) => x.id === id);
    return b ? `${b.code}${b.sizeMm ? ` (${b.sizeMm}mm)` : ""}` : "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(36,26,17,0.55)" }}>
      <div className="kuwa-sheet w-full max-w-md mx-auto max-h-[90vh] flex flex-col">
        <div className="kuwa-sheet-bar sticky top-0 px-5 py-4 flex items-center justify-between flex-shrink-0 rounded-t-[24px]">
          <h2 className="text-lg font-bold text-[#31241a]">ブリードラインを作成</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#e6dbc6]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#40352a] mb-1">ライン名 *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例: 2026-A"
              className={inputCls}
            />
          </div>

          <SpeciesSelect
            value={form.species}
            custom={form.customSpecies}
            onChange={(species) => setForm({ ...form, species })}
            onCustomChange={(customSpecies) => setForm({ ...form, customSpecies })}
            className={inputCls}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">♂ 種親オス</label>
              <select
                value={form.maleId}
                onChange={(e) => setForm({ ...form, maleId: e.target.value })}
                className={inputCls}
              >
                <option value="">未選択</option>
                {males.map((b) => (
                  <option key={b.id} value={b.id}>{beetleLabel(b.id)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">♀ 種親メス</label>
              <select
                value={form.femaleId}
                onChange={(e) => setForm({ ...form, femaleId: e.target.value })}
                className={inputCls}
              >
                <option value="">未選択</option>
                {females.map((b) => (
                  <option key={b.id} value={b.id}>{beetleLabel(b.id)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#40352a] mb-1">ペアリング開始日</label>
            <input
              type="date"
              value={form.pairingDate}
              onChange={(e) => setForm({ ...form, pairingDate: e.target.value })}
              className={inputCls}
            />
          </div>

          <div className="pb-4">
            <label className="block text-sm font-medium text-[#40352a] mb-1">メモ</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="狙い・組み合わせの意図など"
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
                : "bg-[#6b4423] hover:bg-[#5a381c] active:scale-[0.98] text-[#fdf6e7]"
            }`}
          >
            {done ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                できました！
              </>
            ) : submitting ? (
              "作成しています…"
            ) : (
              "作成する"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
