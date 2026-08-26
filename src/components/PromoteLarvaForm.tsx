"use client";

import { useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { Gender, Larva } from "@/types";
import { deriveOffspringInfo, larvaCost, formatYen } from "@/lib/breeding";
import { useToast } from "@/components/ui/Toast";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "♂ オス" },
  { value: "female", label: "♀ メス" },
  { value: "unknown", label: "不明" },
];

/**
 * 羽化した幼虫を成虫台帳へ引き上げる。
 *
 * 幼虫の記録から埋まるもの (種類・羽化日・写真・出身ライン) は触らせず、
 * 人が確かめないと決まらないものだけ聞く。産地と累代は親から引き継ぐ。
 */
export function PromoteLarvaForm({ larva }: { larva: Larva }) {
  const { beetles, lines, promoteLarva } = useKuwagataStore();
  const { showToast } = useToast();

  const line = larva.lineId ? lines.find((l) => l.id === larva.lineId) : undefined;
  const inherited = deriveOffspringInfo(line, beetles);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: larva.code,
    name: "",
    gender: larva.gender,
    sizeMm: larva.emergedSizeMm != null ? String(larva.emergedSizeMm) : "",
    locality: inherited.locality,
    generation: inherited.generation,
  });

  // 引き上げずみかどうかは成虫側の実在で判断する。
  // 成虫を消した場合に「登録ずみ」のまま手詰まりにならないようにするため。
  const promoted = larva.promotedBeetleId
    ? beetles.find((b) => b.id === larva.promotedBeetleId)
    : undefined;

  const cost = larvaCost(larva);
  const duplicateCode =
    !promoted &&
    form.code.trim() !== "" &&
    beetles.some((b) => b.code.trim() === form.code.trim());
  const canSubmit = form.code.trim() !== "" && !duplicateCode;

  const submit = () => {
    if (!canSubmit) return;
    const created = promoteLarva(larva.id, {
      code: form.code,
      name: form.name,
      gender: form.gender,
      sizeMm: form.sizeMm ? parseFloat(form.sizeMm) : undefined,
      locality: form.locality,
      generation: form.generation,
    });
    if (created) {
      setOpen(false);
      showToast(`${created.code} を成虫台帳に登録しました`);
    } else {
      showToast("すでに登録ずみです", "info");
    }
  };

  if (promoted) {
    return (
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: "var(--kuwa-moss-bg)", border: "1px solid var(--kuwa-line)" }}
      >
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--kuwa-moss)", color: "#fdf6e7" }}
        >
          <Check className="w-5 h-5" strokeWidth={2.6} />
        </span>
        <div className="min-w-0">
          <p className="font-maru text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
            成虫台帳に登録ずみ
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--kuwa-ink-soft)" }}>
            {promoted.code}
            {promoted.name && ` (${promoted.name})`} として管理中。この育成記録はそのまま残ります。
          </p>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-all"
        style={{ background: "var(--kuwa-amber-soft)", border: "1px solid rgba(163,102,15,0.3)" }}
      >
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--kuwa-amber)", color: "#fdf6e7" }}
        >
          <ArrowUpRight className="w-5 h-5" strokeWidth={2.6} />
        </span>
        <span className="text-left min-w-0">
          <span className="block font-maru text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
            成虫として登録する
          </span>
          <span className="block text-xs mt-0.5" style={{ color: "var(--kuwa-ink-soft)" }}>
            エサやりや販売の管理に進めます
          </span>
        </span>
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--kuwa-card)", border: "1px solid var(--kuwa-line)" }}
    >
      <p className="font-maru text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
        成虫として登録
      </p>
      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
        種類・羽化日・写真は、この子の記録からそのまま引き継ぎます。
      </p>

      <div className="mt-3.5 space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--kuwa-ink)" }}>
            管理番号
          </label>
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            className="kuwa-input"
            placeholder="26OK-A1"
          />
          {duplicateCode && (
            <p className="text-[11px] mt-1.5" style={{ color: "var(--kuwa-clay)" }}>
              この番号の成虫がすでにいます。別の番号にしてください
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--kuwa-ink)" }}>
            愛称 <span style={{ color: "var(--kuwa-ink-soft)" }}>(なくても大丈夫)</span>
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="kuwa-input"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--kuwa-ink)" }}>
            性別
          </label>
          <div className="flex gap-2">
            {GENDERS.map((g) => (
              <button
                key={g.value}
                onClick={() => setForm({ ...form, gender: g.value })}
                className="kuwa-chip flex-1"
                data-on={form.gender === g.value}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--kuwa-ink)" }}>
              体長 (mm)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.sizeMm}
              onChange={(e) => setForm({ ...form, sizeMm: e.target.value })}
              className="kuwa-input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--kuwa-ink)" }}>
              累代
            </label>
            <input
              value={form.generation}
              onChange={(e) => setForm({ ...form, generation: e.target.value })}
              className="kuwa-input"
              placeholder="CBF2"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--kuwa-ink)" }}>
            産地
          </label>
          <input
            value={form.locality}
            onChange={(e) => setForm({ ...form, locality: e.target.value })}
            className="kuwa-input"
            placeholder="山梨県韮崎"
          />
        </div>

        {(inherited.locality || inherited.generation) && (
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
            産地と累代は親から引き継いで入れてあります。違っていれば直してください。
          </p>
        )}
      </div>

      {cost > 0 && (
        <div
          className="mt-3.5 rounded-xl px-3 py-2.5 flex items-baseline justify-between"
          style={{ background: "var(--kuwa-bark-bg)" }}
        >
          <span className="text-xs" style={{ color: "var(--kuwa-ink-soft)" }}>
            ここまでの育成費用
          </span>
          <span
            className="font-maru text-sm font-bold"
            style={{ color: "var(--kuwa-bark)", fontVariantNumeric: "tabular-nums" }}
          >
            {formatYen(cost)}
          </span>
        </div>
      )}
      <p className="text-[11px] mt-2 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
        育成にかかった費用はこの育成記録のまま集計を続けます。成虫の入手金額には足しません
        (同じ出費を二重に数えないため)。
      </p>

      <div className="flex gap-2 mt-3.5">
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="kuwa-btn-primary flex-1 py-3 text-sm active:scale-[0.98] transition-all disabled:opacity-40"
        >
          登録する
        </button>
        <button
          onClick={() => setOpen(false)}
          className="kuwa-btn-ghost px-5 py-3 text-sm active:scale-[0.98] transition-all"
        >
          やめる
        </button>
      </div>
    </div>
  );
}
