"use client";

import { useState } from "react";
import { CheckCircle2, Pencil, Shovel, Trash2, Worm, X } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { BreedingLine, Larva } from "@/types";
import {
  LINE_STATUS_COLORS,
  LINE_STATUS_LABELS,
  SPECIES_OPTIONS,
} from "@/lib/breeding";
import { formatDate, generateId } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import {
  LineFields,
  LineFormState,
  formToLine,
  isLineFormValid,
  lineToForm,
} from "@/components/LineFields";
import { TOOL_IMAGE } from "@/lib/assets";

interface LineDetailModalProps {
  line: BreedingLine;
  onClose: () => void;
}

const inputCls =
  "kuwa-input";

export function LineDetailModal({ line: initial, onClose }: LineDetailModalProps) {
  const { lines, beetles, updateLine, deleteLine, addLarva, getLarvaeByLine } =
    useKuwagataStore();
  const { showToast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<LineFormState | null>(null);

  const saveEdit = () => {
    if (!editForm || !isLineFormValid(editForm)) return;
    updateLine(line.id, formToLine(editForm));
    setEditing(false);
    showToast("書きかえました");
  };

  const line = lines.find((l) => l.id === initial.id) ?? initial;
  const male = line.maleId ? beetles.find((b) => b.id === line.maleId) : undefined;
  const female = line.femaleId ? beetles.find((b) => b.id === line.femaleId) : undefined;
  const lineLarvae = getLarvaeByLine(line.id);

  const today = new Date().toISOString().split("T")[0];
  const [setForm, setSetForm] = useState({ date: today, type: "産卵材 + 発酵マット" });
  const [splitForm, setSplitForm] = useState({
    date: today,
    larvaCount: "",
    eggCount: "",
    autoCreate: true,
  });

  const recordSet = () => {
    updateLine(line.id, {
      status: "laying",
      setDate: setForm.date,
      setType: setForm.type,
    });
    showToast("セット投入を記録しました！");
  };

  const recordSplit = () => {
    const larvaCount = splitForm.larvaCount ? parseInt(splitForm.larvaCount) : 0;
    updateLine(line.id, {
      status: "split_done",
      splitDate: splitForm.date,
      larvaCount: larvaCount || undefined,
      eggCount: splitForm.eggCount ? parseInt(splitForm.eggCount) : undefined,
    });
    if (splitForm.autoCreate && larvaCount > 0) {
      const existing = lineLarvae.length;
      for (let i = 0; i < larvaCount; i++) {
        const num = String(existing + i + 1).padStart(2, "0");
        const larva: Larva = {
          id: generateId(),
          code: `${line.name}-${num}`,
          lineId: line.id,
          species: line.species,
          stage: "L1",
          gender: "unknown",
          hatchDate: splitForm.date,
          bottleChanges: [],
          isAlive: true,
          notes: "",
        };
        addLarva(larva);
      }
      showToast(`割り出しを記録し、幼虫${larvaCount}頭を作成しました`);
    } else {
      showToast("割り出しを記録しました！");
    }
  };

  const handleDelete = () => {
    deleteLine(line.id);
    showToast(`ライン ${line.name} を消しました`);
    onClose();
  };

  const timeline: { label: string; date?: string; extra?: string }[] = [
    { label: "ペアリング開始", date: line.pairingDate },
    { label: "産卵セット投入", date: line.setDate, extra: line.setType },
    {
      label: "割り出し",
      date: line.splitDate,
      extra:
        line.larvaCount != null
          ? `幼虫${line.larvaCount}頭${line.eggCount != null ? ` / 卵${line.eggCount}個` : ""}`
          : undefined,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(36,26,17,0.55)" }} onClick={onClose}>
      <div
        className="kuwa-sheet w-full max-w-md mx-auto max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kuwa-sheet-bar sticky top-0 px-5 py-4 flex items-center justify-between flex-shrink-0 rounded-t-[24px]">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-bold text-[#31241a] truncate">{line.name}</h2>
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${LINE_STATUS_COLORS[line.status]}`}
            >
              {LINE_STATUS_LABELS[line.status]}
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#e6dbc6]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="kuwa-sheet-body flex-1 px-5 py-5 space-y-5">
          {editing ? (
            <div className="space-y-3.5">
              <LineFields form={editForm!} onChange={setEditForm} showProgress />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveEdit}
                  disabled={!editForm || !isLineFormValid(editForm)}
                  className="kuwa-btn-primary flex-1 py-3 text-sm active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  保存する
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="kuwa-btn-ghost px-5 py-3 text-sm active:scale-[0.98] transition-all"
                >
                  やめる
                </button>
              </div>
            </div>
          ) : (
            <>
          {/* ペア情報 */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#cfdbdd]/60 rounded-2xl px-4 py-3.5">
              <p className="text-[10px] font-bold text-[#3f5a72] mb-0.5">♂ 種親オス</p>
              {male ? (
                <>
                  <p className="text-sm font-bold text-[#31241a] truncate">{male.code}</p>
                  <p className="text-xs text-[#8b7a64]">
                    {male.sizeMm != null ? `${male.sizeMm}mm` : ""} {male.generation ?? ""}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#8b7a64]">未設定</p>
              )}
            </div>
            <div className="bg-[#eccfc2]/60 rounded-2xl px-4 py-3.5">
              <p className="text-[10px] font-bold text-[#a3502f] mb-0.5">♀ 種親メス</p>
              {female ? (
                <>
                  <p className="text-sm font-bold text-[#31241a] truncate">{female.code}</p>
                  <p className="text-xs text-[#8b7a64]">
                    {female.sizeMm != null ? `${female.sizeMm}mm` : ""} {female.generation ?? ""}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#8b7a64]">未設定</p>
              )}
            </div>
          </div>

          {/* タイムライン */}
          <div>
            <h3 className="text-sm font-bold text-[#31241a] mb-2">進行状況</h3>
            <div className="space-y-0">
              {timeline.map((t, i) => (
                <div key={t.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full mt-1 ${
                        t.date ? "bg-[#a3660f]" : "bg-[#d8c9ae]"
                      }`}
                    />
                    {i < timeline.length - 1 && (
                      <div className={`w-0.5 flex-1 ${t.date ? "bg-[#e8cfa0]" : "bg-[#e6dbc6]"}`} />
                    )}
                  </div>
                  <div className="pb-4 min-w-0">
                    <p className={`text-sm font-semibold ${t.date ? "text-[#31241a]" : "text-[#b3a189]"}`}>
                      {t.label}
                    </p>
                    {t.date && <p className="text-xs text-[#8b7a64]">{formatDate(t.date)}</p>}
                    {t.extra && <p className="text-xs text-[#a3660f] mt-0.5">{t.extra}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ステータス操作 */}
          {line.status === "pairing" && (
            <div className="bg-[#e3ceaa]/55 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-[#31241a] flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={TOOL_IMAGE.log} alt="" width={20} height={20} />
                産卵セット投入を記録
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="date"
                  value={setForm.date}
                  onChange={(e) => setSetForm({ ...setForm, date: e.target.value })}
                  className={inputCls}
                />
                <input
                  value={setForm.type}
                  onChange={(e) => setSetForm({ ...setForm, type: e.target.value })}
                  placeholder="セット内容"
                  className={inputCls}
                />
              </div>
              <button
                onClick={recordSet}
                className="w-full py-3 rounded-xl bg-[#6b4423] text-[#fdf6e7] text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                セット投入を記録
              </button>
            </div>
          )}

          {(line.status === "laying" || line.status === "waiting_split") && (
            <div className="bg-[#f0d49b]/55 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-[#31241a] flex items-center gap-1.5">
                <Shovel className="w-4 h-4 text-[#a3660f]" />
                割り出しを記録
              </h3>
              <input
                type="date"
                value={splitForm.date}
                onChange={(e) => setSplitForm({ ...splitForm, date: e.target.value })}
                className={inputCls}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-[#77644b] mb-1">幼虫数</label>
                  <input
                    type="number"
                    min="0"
                    value={splitForm.larvaCount}
                    onChange={(e) => setSplitForm({ ...splitForm, larvaCount: e.target.value })}
                    placeholder="頭数"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#77644b] mb-1">卵の数 (任意)</label>
                  <input
                    type="number"
                    min="0"
                    value={splitForm.eggCount}
                    onChange={(e) => setSplitForm({ ...splitForm, eggCount: e.target.value })}
                    placeholder="個数"
                    className={inputCls}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSplitForm({ ...splitForm, autoCreate: !splitForm.autoCreate })}
                className="flex items-center gap-2 text-sm text-[#77644b]"
              >
                <span
                  className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                    splitForm.autoCreate
                      ? "bg-[#6b4423] border-amber-600 text-[#fdf6e7]"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {splitForm.autoCreate && <CheckCircle2 className="w-3.5 h-3.5" />}
                </span>
                幼虫データを自動作成する ({line.name}-01, 02, ...)
              </button>
              <button
                onClick={recordSplit}
                className="w-full py-3 rounded-xl bg-[#a3660f] text-[#fdf6e7] text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                割り出しを記録
              </button>
            </div>
          )}

          {line.status === "split_done" && (
            <button
              onClick={() => {
                updateLine(line.id, { status: "finished" });
                showToast("ラインを終了にしました");
              }}
              className="w-full py-3 rounded-xl border border-[rgba(107,68,35,0.16)] text-[#77644b] text-sm font-semibold active:scale-[0.98] transition-all"
            >
              このラインを終了にする
            </button>
          )}

          {/* このラインの幼虫 */}
          {lineLarvae.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[#31241a] mb-2 flex items-center gap-1.5">
                <Worm className="w-4 h-4 text-[#55682f]" />
                このラインの幼虫 ({lineLarvae.length}頭)
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {lineLarvae.map((l) => (
                  <span
                    key={l.id}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      l.isAlive ? "bg-[#d7e0b8] text-[#4f5f2a]" : "bg-[#e6dbc6] text-[#8b7a64]"
                    }`}
                  >
                    {l.code}
                  </span>
                ))}
              </div>
            </div>
          )}

          {line.notes && (
            <div>
              <h3 className="text-sm font-bold text-[#31241a] mb-1.5">メモ</h3>
              <p className="text-sm text-[#77644b] bg-[#f1e7d5] rounded-xl px-3.5 py-3 whitespace-pre-wrap">
                {line.notes}
              </p>
            </div>
          )}

          <button
            onClick={() => (confirmDelete ? handleDelete() : setConfirmDelete(true))}
            className={`w-full py-3 rounded-xl text-sm font-semibold border flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all mb-2 ${
              confirmDelete
                ? "bg-[#a3502f] text-[#fdf6e7] border-[#a3502f]"
                : "border-[rgba(163,80,47,0.4)] text-[#a3502f]"
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {confirmDelete ? "ほんとうに消す (幼虫の記録は残ります)" : "ラインを削除"}
          </button>

              <button
                onClick={() => {
                  setEditForm(lineToForm(line, SPECIES_OPTIONS));
                  setEditing(true);
                }}
                className="kuwa-btn-ghost w-full py-3 text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
              >
                <Pencil className="w-4 h-4" strokeWidth={2.2} />
                このラインの情報を直す
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
