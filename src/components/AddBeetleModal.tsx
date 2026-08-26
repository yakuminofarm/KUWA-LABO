"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { Beetle, Gender } from "@/types";
import { SPECIES_OPTIONS } from "@/lib/breeding";
import { generateId } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { PhotoPicker } from "@/components/KuwaUI";

interface AddBeetleModalProps {
  onClose: () => void;
}

const inputCls =
  "kuwa-input";

export function AddBeetleModal({ onClose }: AddBeetleModalProps) {
  const addBeetle = useKuwagataStore((s) => s.addBeetle);
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    species: "オオクワガタ",
    customSpecies: "",
    locality: "",
    generation: "",
    gender: "unknown" as Gender,
    sizeMm: "",
    emergedDate: "",
    acquiredDate: new Date().toISOString().split("T")[0],
    priceYen: "",
    matured: false,
    notes: "",
  });
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();

  const canSubmit = form.code.trim() !== "" && form.acquiredDate !== "";

  const handleSubmit = () => {
    if (!canSubmit || submitting || done) return;
    setSubmitting(true);
    const species =
      form.species === "その他" ? form.customSpecies || "その他" : form.species;
    const beetle: Beetle = {
      id: generateId(),
      code: form.code.trim(),
      name: form.name.trim() || undefined,
      species,
      locality: form.locality.trim() || undefined,
      generation: form.generation.trim() || undefined,
      gender: form.gender,
      sizeMm: form.sizeMm ? parseFloat(form.sizeMm) : undefined,
      emergedDate: form.emergedDate || undefined,
      acquiredDate: form.acquiredDate,
      priceYen: form.priceYen ? parseInt(form.priceYen) : undefined,
      matured: form.matured,
      photoUrl,
      isAlive: true,
      notes: form.notes,
    };
    addBeetle(beetle);
    setDone(true);
    showToast(`${beetle.code} を迎えました！`);
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

        <div className="overflow-y-auto flex-1 px-5 pt-5 space-y-4">
          <PhotoPicker value={photoUrl} onChange={setPhotoUrl} label="この子の写真" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">管理番号 *</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="例: 26OK-A1"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">愛称</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="任意"
                className={inputCls}
              />
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">産地・血統</label>
              <input
                value={form.locality}
                onChange={(e) => setForm({ ...form, locality: e.target.value })}
                placeholder="例: 能勢YG血統"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">累代</label>
              <input
                value={form.generation}
                onChange={(e) => setForm({ ...form, generation: e.target.value })}
                placeholder="例: CBF2 / WD"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#40352a] mb-1">性別</label>
            <div className="flex gap-2">
              {[
                { value: "male", label: "♂ オス" },
                { value: "female", label: "♀ メス" },
                { value: "unknown", label: "不明" },
              ].map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setForm({ ...form, gender: g.value as Gender })}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-colors min-h-[44px] ${
                    form.gender === g.value
                      ? "bg-[#6b4423] text-[#fdf6e7] border-[#6b4423]"
                      : "border-[rgba(107,68,35,0.16)] text-[#77644b]"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">体長 (mm)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.sizeMm}
                onChange={(e) => setForm({ ...form, sizeMm: e.target.value })}
                placeholder="例: 85.5"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">羽化日</label>
              <input
                type="date"
                value={form.emergedDate}
                onChange={(e) => setForm({ ...form, emergedDate: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-[#40352a] mb-1">入手日 *</label>
              <input
                type="date"
                value={form.acquiredDate}
                onChange={(e) => setForm({ ...form, acquiredDate: e.target.value })}
                className={inputCls}
              />
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, matured: !form.matured })}
              className={`py-3 rounded-xl text-sm font-semibold border transition-colors min-h-[44px] ${
                form.matured
                  ? "bg-[#55682f] text-[#fdf6e7] border-[#55682f]"
                  : "border-[rgba(107,68,35,0.16)] text-[#77644b]"
              }`}
            >
              後食済み
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#40352a] mb-1">入手金額 (円)</label>
            <input
              type="number"
              min="0"
              value={form.priceYen}
              onChange={(e) => setForm({ ...form, priceYen: e.target.value })}
              placeholder="例: 15000 (収支管理に反映されます)"
              className={inputCls}
            />
          </div>

          <div className="pb-4">
            <label className="block text-sm font-medium text-[#40352a] mb-1">メモ</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="特徴・購入元など"
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
