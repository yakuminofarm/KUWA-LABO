"use client";

import { useState } from "react";
import { CheckCircle2, HandCoins, Pencil, Plus, Receipt, Trash2, Worm, X } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { Expense, ExpenseCategory } from "@/types";
import {
  EXPENSE_CATEGORIES,
  calcCostSummary,
  formatYen,
  larvaCost,
} from "@/lib/breeding";
import { formatDateShort, generateId } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { SectionTitle } from "@/components/KuwaUI";

interface ExpenseFormState {
  date: string;
  category: ExpenseCategory;
  amountYen: string;
  memo: string;
}

function emptyForm(): ExpenseFormState {
  return {
    date: new Date().toISOString().split("T")[0],
    category: "ゼリー",
    amountYen: "",
    memo: "",
  };
}

function ExpenseForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial: ExpenseFormState;
  onSubmit: (form: ExpenseFormState) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [form, setForm] = useState(initial);
  const canSubmit = form.amountYen !== "" && parseInt(form.amountYen) > 0;
  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: "var(--kuwa-bark-bg)", border: "1px solid var(--kuwa-line)" }}
    >
      <div className="grid grid-cols-2 gap-2.5">
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="kuwa-input"
        />
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
          className="kuwa-input"
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <input
          type="number"
          min="0"
          value={form.amountYen}
          onChange={(e) => setForm({ ...form, amountYen: e.target.value })}
          placeholder="金額 (円)"
          className="kuwa-input"
        />
        <input
          value={form.memo}
          onChange={(e) => setForm({ ...form, memo: e.target.value })}
          placeholder="メモ (任意)"
          className="kuwa-input"
        />
      </div>
      <div className="flex gap-2.5">
        <button
          onClick={onCancel}
          className="kuwa-btn-ghost flex-1 py-3 text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
        >
          <X className="w-4 h-4" strokeWidth={2.2} />
          やめる
        </button>
        <button
          onClick={() => canSubmit && onSubmit(form)}
          disabled={!canSubmit}
          className="kuwa-btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
        >
          <CheckCircle2 className="w-4 h-4" strokeWidth={2.2} />
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

export function CostTab() {
  const { beetles, larvae, expenses, addExpense, updateExpense, deleteExpense } =
    useKuwagataStore();
  const { showToast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const summary = calcCostSummary(beetles, larvae, expenses);

  const breakdown: { label: string; amount: number }[] = [
    { label: "生体のお迎え (成虫)", amount: summary.beetlePurchase },
    { label: "生体のお迎え (幼虫)", amount: summary.larvaPurchase },
    { label: "ビン・マット代", amount: summary.bottleCost },
    ...EXPENSE_CATEGORIES.map((c) => ({
      label: c,
      amount: summary.expenseByCategory[c] ?? 0,
    })),
  ].filter((b) => b.amount > 0);
  const maxAmount = Math.max(1, ...breakdown.map((b) => b.amount));

  const soldBeetles = beetles
    .filter((b) => b.soldPriceYen != null)
    .sort((a, b) => (b.soldDate ?? "").localeCompare(a.soldDate ?? ""));

  const costlyLarvae = larvae
    .filter((l) => l.isAlive && larvaCost(l) > 0)
    .sort((a, b) => larvaCost(b) - larvaCost(a))
    .slice(0, 5);

  const sortedExpenses = [...expenses].sort((a, b) => b.date.localeCompare(a.date));

  const handleAdd = (form: ExpenseFormState) => {
    const expense: Expense = {
      id: generateId(),
      date: form.date,
      category: form.category,
      amountYen: parseInt(form.amountYen),
      memo: form.memo || undefined,
    };
    addExpense(expense);
    setShowAdd(false);
    showToast("記録しました！");
  };

  const handleEdit = (id: string, form: ExpenseFormState) => {
    updateExpense(id, {
      date: form.date,
      category: form.category,
      amountYen: parseInt(form.amountYen),
      memo: form.memo || undefined,
    });
    setEditingId(null);
    showToast("書きかえました");
  };

  const balancePositive = summary.balance >= 0;

  return (
    <div className="space-y-7">
      {/* 収支サマリー */}
      <div
        className="rounded-[20px] p-6 kuwa-shadow-lg relative overflow-hidden"
        style={{
          background:
            "radial-gradient(120% 90% at 15% 0%, #5c4022 0%, #3a2917 45%, var(--kuwa-soil) 100%)",
        }}
      >
        <p
          className="font-maru text-[11px] font-bold tracking-wider"
          style={{ color: "var(--kuwa-gold)" }}
        >
          いまの収支
        </p>
        <p
          className="text-[32px] font-bold mt-1 leading-none"
          style={{ color: "#fdf6e7", fontVariantNumeric: "tabular-nums" }}
        >
          {balancePositive ? "+" : "−"}
          {formatYen(Math.abs(summary.balance)).slice(1)}
          <span className="text-base font-semibold ml-1" style={{ color: "rgba(247,232,203,0.55)" }}>
            円
          </span>
        </p>
        <div
          className="grid grid-cols-2 gap-3 mt-5 pt-5"
          style={{ borderTop: "1px solid rgba(224,166,63,0.22)" }}
        >
          <div>
            <p className="text-[11px] font-semibold" style={{ color: "rgba(247,232,203,0.6)" }}>
              つかったお金
            </p>
            <p
              className="text-lg font-bold mt-0.5"
              style={{ color: "#fdf6e7", fontVariantNumeric: "tabular-nums" }}
            >
              {formatYen(summary.totalSpent)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold" style={{ color: "rgba(247,232,203,0.6)" }}>
              販売による売上
            </p>
            <p
              className="text-lg font-bold mt-0.5"
              style={{ color: "var(--kuwa-gold)", fontVariantNumeric: "tabular-nums" }}
            >
              {formatYen(summary.salesTotal)}
            </p>
          </div>
        </div>
      </div>

      {/* 支出の内訳 */}
      {breakdown.length > 0 && (
        <section>
          <div className="mb-3 px-0.5">
            <SectionTitle icon={Receipt} color="var(--kuwa-amber)">
              なにに使ったか
            </SectionTitle>
          </div>
          <div className="kuwa-card p-5 space-y-4">
            {breakdown.map((b) => (
              <div key={b.label}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-sm" style={{ color: "var(--kuwa-ink)" }}>
                    {b.label}
                  </span>
                  <span
                    className="text-sm font-bold"
                    style={{ color: "var(--kuwa-ink)", fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatYen(b.amount)}
                  </span>
                </div>
                <div
                  className="h-2.5 rounded-full overflow-hidden"
                  style={{ background: "var(--kuwa-bark-bg)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(4, (b.amount / maxAmount) * 100)}%`,
                      background: "linear-gradient(90deg, #c9861f, var(--kuwa-amber))",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 個体別コスト */}
      {costlyLarvae.length > 0 && (
        <section>
          <div className="mb-2 px-0.5">
            <SectionTitle icon={Worm} color="var(--kuwa-moss)">
              1頭にかかったお金
            </SectionTitle>
          </div>
          <p className="text-xs mb-3 px-1" style={{ color: "var(--kuwa-ink-soft)" }}>
            お迎え金額とビン代の合計です。売値を決めるときの目安に。
          </p>
          <div className="kuwa-card overflow-hidden">
            {costlyLarvae.map((l, i) => (
              <div
                key={l.id}
                className="px-5 py-3.5 flex justify-between items-center"
                style={i > 0 ? { borderTop: "1px solid var(--kuwa-line)" } : undefined}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
                    {l.code}
                  </p>
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--kuwa-ink-soft)" }}>
                    {l.species}
                  </p>
                </div>
                <p
                  className="text-sm font-bold"
                  style={{ color: "var(--kuwa-amber)", fontVariantNumeric: "tabular-nums" }}
                >
                  {formatYen(larvaCost(l))}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 販売記録 */}
      <section>
        <div className="mb-2 px-0.5">
          <SectionTitle icon={HandCoins} color="var(--kuwa-moss)">
            お迎えされた子たち
          </SectionTitle>
        </div>
        <p className="text-xs mb-3 px-1" style={{ color: "var(--kuwa-ink-soft)" }}>
          成虫の詳細から「販売を記録」で追加できます。
        </p>
        {soldBeetles.length === 0 ? (
          <div className="kuwa-card px-5 py-6 text-center">
            <p className="text-sm" style={{ color: "var(--kuwa-ink-soft)" }}>
              まだ販売の記録はありません
            </p>
          </div>
        ) : (
          <div className="kuwa-card overflow-hidden">
            {soldBeetles.map((b, i) => (
              <div
                key={b.id}
                className="px-5 py-3.5 flex justify-between items-center gap-3"
                style={i > 0 ? { borderTop: "1px solid var(--kuwa-line)" } : undefined}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
                    {b.code}
                    <span
                      className="text-xs font-normal ml-2"
                      style={{ color: "var(--kuwa-ink-soft)" }}
                    >
                      {b.species}
                    </span>
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--kuwa-ink-soft)" }}>
                    {b.soldDate && formatDateShort(b.soldDate)}
                    {b.soldTo && ` → ${b.soldTo}`}
                  </p>
                </div>
                <p
                  className="text-sm font-bold flex-shrink-0"
                  style={{ color: "var(--kuwa-moss)", fontVariantNumeric: "tabular-nums" }}
                >
                  {formatYen(b.soldPriceYen!)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 消耗品・経費 */}
      <section className="pb-2">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <SectionTitle icon={Receipt} color="var(--kuwa-bark)">
            えさ・消耗品の記録
          </SectionTitle>
          {!showAdd && (
            <button
              onClick={() => {
                setShowAdd(true);
                setEditingId(null);
              }}
              className="font-maru text-xs font-bold flex items-center gap-0.5"
              style={{ color: "var(--kuwa-bark)" }}
            >
              <Plus className="w-4 h-4" strokeWidth={2.4} />
              ふやす
            </button>
          )}
        </div>

        {showAdd && (
          <div className="mb-3">
            <ExpenseForm
              initial={emptyForm()}
              onSubmit={handleAdd}
              onCancel={() => setShowAdd(false)}
              submitLabel="記録する"
            />
          </div>
        )}

        {sortedExpenses.length === 0 ? (
          <div className="kuwa-card px-5 py-6 text-center">
            <p className="text-sm" style={{ color: "var(--kuwa-ink-soft)", textWrap: "pretty" }}>
              ゼリーやマットを買ったら記録してみましょう
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedExpenses.map((e) =>
              editingId === e.id ? (
                <ExpenseForm
                  key={e.id}
                  initial={{
                    date: e.date,
                    category: e.category,
                    amountYen: String(e.amountYen),
                    memo: e.memo ?? "",
                  }}
                  onSubmit={(form) => handleEdit(e.id, form)}
                  onCancel={() => setEditingId(null)}
                  submitLabel="書きかえる"
                />
              ) : (
                <div key={e.id} className="kuwa-card px-4 py-3 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
                      {e.category}
                      {e.memo && (
                        <span
                          className="text-xs font-normal ml-2"
                          style={{ color: "var(--kuwa-ink-soft)" }}
                        >
                          {e.memo}
                        </span>
                      )}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--kuwa-ink-soft)" }}>
                      {formatDateShort(e.date)}
                    </p>
                  </div>
                  <p
                    className="text-sm font-bold flex-shrink-0"
                    style={{ color: "var(--kuwa-ink)", fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatYen(e.amountYen)}
                  </p>
                  <button
                    onClick={() => {
                      setEditingId(e.id);
                      setShowAdd(false);
                      setConfirmDeleteId(null);
                    }}
                    aria-label="書きかえる"
                    className="p-1.5 flex-shrink-0"
                    style={{ color: "#b3a189" }}
                  >
                    <Pencil className="w-4 h-4" strokeWidth={2.2} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirmDeleteId === e.id) {
                        deleteExpense(e.id);
                        setConfirmDeleteId(null);
                        showToast("消しました");
                      } else {
                        setConfirmDeleteId(e.id);
                      }
                    }}
                    aria-label="消す"
                    className="p-1.5 flex-shrink-0"
                    style={{ color: confirmDeleteId === e.id ? "var(--kuwa-clay)" : "#b3a189" }}
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={2.2} />
                  </button>
                </div>
              )
            )}
          </div>
        )}
        {confirmDeleteId && (
          <p className="text-xs mt-2 px-1" style={{ color: "var(--kuwa-clay)" }}>
            もう一度ゴミ箱をタップすると消えます
          </p>
        )}
      </section>
    </div>
  );
}
