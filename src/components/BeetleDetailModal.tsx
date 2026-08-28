"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  CheckCircle2,
  HandCoins,
  Heart,
  Pencil,
  Skull,
  Trophy,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { Beetle } from "@/types";
import { SpeciesAvatar } from "@/components/KuwagataSVG";
import { MoneyInput } from "@/components/KuwaUI";
import {
  FEED_INTERVAL_OPTIONS,
  JELLY_PER_FEED_OPTIONS,
  jellyCountLabel,
  jellyPerFeed,
  feedAgoLabel,
  FOOD_OPTIONS,
  feedIntervalFor,
  feedIntervalLabel,
  foodFor,
  formatYen,
  genderColor,
  SPECIES_OPTIONS,
  larvaCost,
  todayStr,
} from "@/lib/breeding";
import { formatDate, getGenderLabel } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { PhotoPicker, PhotoThumb } from "@/components/KuwaUI";
import {
  BeetleFields,
  BeetleFormState,
  beetleToForm,
  formToBeetle,
  isBeetleFormValid,
} from "@/components/BeetleFields";

const inputCls =
  "kuwa-input";

interface BeetleDetailModalProps {
  beetle: Beetle;
  onClose: () => void;
  /** この子をもとに新しく登録する。渡されなければボタンを出さない */
  onDuplicate?: (beetle: Beetle) => void;
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-[rgba(107,68,35,0.12)] last:border-0">
      <span className="text-sm text-[#8b7a64]">{label}</span>
      <span className="text-sm font-semibold text-[#31241a] text-right">{value}</span>
    </div>
  );
}

export function BeetleDetailModal({ beetle: initial, onClose, onDuplicate }: BeetleDetailModalProps) {
  const { beetles, lines, larvae, reminder, updateBeetle, deleteBeetle, toggleFavorite, toggleFedToday } =
    useKuwagataStore();
  const { showToast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<BeetleFormState | null>(null);

  const saveEdit = () => {
    if (!form || !isBeetleFormValid(form)) return;
    const patch = formToBeetle(form);
    // 後食は専用の導線があるので、編集では触らない
    delete (patch as Partial<typeof patch>).matured;
    updateBeetle(beetle.id, patch);
    setEditing(false);
    showToast("書きかえました");
  };
  const [showSellForm, setShowSellForm] = useState(false);
  const [sellForm, setSellForm] = useState({
    date: new Date().toISOString().split("T")[0],
    price: "",
    to: "",
  });

  // ストアの最新状態を参照 (お気に入り等の即時反映のため)
  const beetle = beetles.find((b) => b.id === initial.id) ?? initial;
  // 自家産の個体は入手金額を持たない。代わりに育成にかかった額を元の記録から出す
  const sourceLarva = beetle.sourceLarvaId
    ? larvae.find((l) => l.id === beetle.sourceLarvaId)
    : undefined;
  const rearingCost = sourceLarva ? larvaCost(sourceLarva) : 0;

  const relatedLines = lines.filter(
    (l) => l.maleId === beetle.id || l.femaleId === beetle.id
  );

  const handleDelete = () => {
    deleteBeetle(beetle.id);
    showToast(`${beetle.code} を消しました`);
    onClose();
  };

  const handleToggleAlive = () => {
    updateBeetle(beetle.id, { isAlive: !beetle.isAlive });
    showToast(beetle.isAlive ? "飼育終了として記録しました" : "生存中に戻しました");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(36,26,17,0.55)" }} onClick={onClose}>
      <div
        className="kuwa-sheet w-full max-w-md mx-auto max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kuwa-sheet-bar sticky top-0 px-5 py-4 flex items-center justify-between flex-shrink-0 rounded-t-[24px]">
          <div className="flex items-center gap-2.5 min-w-0">
            <PhotoThumb src={beetle.photoUrl} fallback={<SpeciesAvatar species={beetle.species} />} />
            <h2 className="text-lg font-bold text-[#31241a] truncate">
              {beetle.code}
              {beetle.name && <span className="text-sm text-[#8b7a64] ml-1.5">「{beetle.name}」</span>}
            </h2>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => toggleFavorite(beetle.id)}
              className="p-2 rounded-full hover:bg-[#e6dbc6]"
            >
              <Heart
                className={`w-5 h-5 ${
                  beetle.isFavorite ? "text-[#b0492f] fill-[#b0492f]" : "text-[#b3a189]"
                }`}
              />
            </button>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-[#e6dbc6]">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">
          <PhotoPicker
            value={beetle.photoUrl}
            onChange={(url) => updateBeetle(beetle.id, { photoUrl: url })}
            label="この子の写真"
          />

          {/* 後食前: エサやりの輪に入れるための切りかえ。
              羽化したての個体は後食を始めるまで食べないので、
              始まったと分かった時点でここから記録する */}
          {!beetle.matured && beetle.isAlive && beetle.soldPriceYen == null && (
            <button
              onClick={() => {
                updateBeetle(beetle.id, { matured: true });
                showToast("後食を記録しました。今日からエサやりの対象になります");
              }}
              className="w-full rounded-2xl px-4 py-4 flex items-center gap-3.5 active:scale-[0.98] transition-all"
              style={{ background: "var(--kuwa-card)", border: "1px dashed rgba(163,102,15,0.5)" }}
            >
              <span
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--kuwa-bark-bg)", color: "var(--kuwa-bark)" }}
              >
                <UtensilsCrossed className="w-5 h-5" strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className="font-maru text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
                  後食を始めた
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--kuwa-ink-soft)" }}>
                  記録するとエサやりの対象になります
                </p>
              </div>
            </button>
          )}

          {/* この個体の餌。ふだんと違うものを与えている子だけ上書きする */}
          {beetle.matured && beetle.isAlive && beetle.soldPriceYen == null && (
            <div
              className="rounded-2xl p-4"
              style={{ background: "var(--kuwa-card)", border: "1px solid var(--kuwa-line)" }}
            >
              <p className="font-maru text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
                この子の餌
              </p>
              <div className="flex flex-wrap gap-2 mt-2.5">
                <button
                  onClick={() => updateBeetle(beetle.id, { foodType: undefined })}
                  className="kuwa-chip"
                  data-on={!beetle.foodType}
                >
                  ふだんと同じ ({reminder.foodType})
                </button>
                {FOOD_OPTIONS.filter((f) => f !== reminder.foodType).map((f) => (
                  <button
                    key={f}
                    onClick={() => updateBeetle(beetle.id, { foodType: f })}
                    className="kuwa-chip"
                    data-on={beetle.foodType === f}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <p className="text-xs mt-2.5" style={{ color: "var(--kuwa-ink-soft)" }}>
                いま与えているのは{" "}
                <strong style={{ color: "var(--kuwa-ink)" }}>
                  {foodFor(beetle, reminder.foodType)}
                </strong>
              </p>

              {/* 間隔も個体ごとに。大型のオスと小さなメスでは減りかたが違う */}
              <p className="font-maru text-sm font-bold mt-4" style={{ color: "var(--kuwa-ink)" }}>
                この子の間隔
              </p>
              <div className="flex flex-wrap gap-2 mt-2.5">
                <button
                  onClick={() => updateBeetle(beetle.id, { feedIntervalDays: undefined })}
                  className="kuwa-chip"
                  data-on={beetle.feedIntervalDays == null}
                >
                  ふだんと同じ ({feedIntervalLabel(reminder.intervalDays)})
                </button>
                {FEED_INTERVAL_OPTIONS.filter((d) => d !== reminder.intervalDays).map((d) => (
                  <button
                    key={d}
                    onClick={() => updateBeetle(beetle.id, { feedIntervalDays: d })}
                    className="kuwa-chip"
                    data-on={beetle.feedIntervalDays === d}
                  >
                    {feedIntervalLabel(d)}
                  </button>
                ))}
              </div>
              <p className="text-xs mt-2.5" style={{ color: "var(--kuwa-ink-soft)" }}>
                エサ替えは{" "}
                <strong style={{ color: "var(--kuwa-ink)" }}>
                  {feedIntervalLabel(feedIntervalFor(beetle, reminder.intervalDays))}
                </strong>
              </p>

              {/* 使う数が分かると、月に何個要るかの見当がつく。
                  細かく付けたくない人はそのままで構わない (未設定は1個) */}
              <p className="font-maru text-sm font-bold mt-4" style={{ color: "var(--kuwa-ink)" }}>
                1回にあげる数
              </p>
              <div className="flex flex-wrap gap-2 mt-2.5">
                {JELLY_PER_FEED_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => updateBeetle(beetle.id, { jellyPerFeed: n })}
                    className="kuwa-chip"
                    data-on={jellyPerFeed(beetle) === n}
                  >
                    {jellyCountLabel(n)}
                  </button>
                ))}
              </div>
              <p className="text-xs mt-2.5" style={{ color: "var(--kuwa-ink-soft)" }}>
                収支の「ひと月のめやす」に使います。入れなくても構いません。
              </p>
            </div>
          )}

          {/* 今日のエサやり */}
          {beetle.matured && beetle.isAlive && beetle.soldPriceYen == null && (
            <button
              onClick={() => toggleFedToday(beetle.id)}
              className="w-full rounded-2xl px-4 py-4 flex items-center gap-3.5 active:scale-[0.98] transition-all"
              style={
                beetle.lastFedDate === todayStr()
                  ? { background: "var(--kuwa-moss-bg)", border: "1px solid rgba(85,104,47,0.35)" }
                  : { background: "var(--kuwa-amber-soft)", border: "1px solid rgba(163,102,15,0.3)" }
              }
            >
              <span
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={
                  beetle.lastFedDate === todayStr()
                    ? { background: "var(--kuwa-moss)", color: "#fdf6e7" }
                    : { background: "var(--kuwa-amber)", color: "#fdf6e7" }
                }
              >
                {beetle.lastFedDate === todayStr() ? (
                  <Check className="w-5 h-5" strokeWidth={3} />
                ) : (
                  <UtensilsCrossed className="w-5 h-5" strokeWidth={2.2} />
                )}
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p
                  className="font-maru text-sm font-bold"
                  style={{
                    color: beetle.lastFedDate === todayStr() ? "#4f5f2a" : "#8a5410",
                  }}
                >
                  {beetle.lastFedDate === todayStr()
                    ? "今日はもうあげました"
                    : "エサをあげたら押してください"}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: beetle.lastFedDate === todayStr() ? "#5f7040" : "#8a6a3a" }}
                >
                  {beetle.lastFedDate === todayStr()
                    ? "日付が変わるとまた未完了に戻ります"
                    : beetle.lastFedDate
                    ? `前回は ${formatDate(beetle.lastFedDate)} (${feedAgoLabel(beetle)})`
                    : "まだ記録がありません"}
                </p>
              </div>
            </button>
          )}

          {editing ? (
            <div className="space-y-3.5">
              <BeetleFields form={form!} onChange={setForm} showMatured={false} />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveEdit}
                  disabled={!form || !isBeetleFormValid(form)}
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
          <div className="bg-[#e3ceaa]/55 rounded-2xl px-4 py-1">
            <InfoRow label="種類" value={beetle.species} />
            <InfoRow label="産地・血統" value={beetle.locality} />
            <InfoRow label="累代" value={beetle.generation} />
            <div className="flex justify-between items-center py-2.5 border-b border-[rgba(107,68,35,0.12)]">
              <span className="text-sm text-[#8b7a64]">性別</span>
              <span className={`text-sm font-bold ${genderColor(beetle.gender)}`}>
                {getGenderLabel(beetle.gender)}
              </span>
            </div>
            <InfoRow label="体長" value={beetle.sizeMm != null ? `${beetle.sizeMm} mm` : undefined} />
            <InfoRow label="羽化日" value={beetle.emergedDate ? formatDate(beetle.emergedDate, beetle.emergedDatePrecision) : undefined} />
            <InfoRow label="入手日" value={formatDate(beetle.acquiredDate, beetle.acquiredDatePrecision)} />
            <InfoRow label="入手金額" value={beetle.priceYen != null ? formatYen(beetle.priceYen) : undefined} />
            {sourceLarva && (
              <InfoRow
                label="育成費用"
                value={rearingCost > 0 ? formatYen(rearingCost) : "記録なし"}
              />
            )}
            <InfoRow
              label="状態"
              value={
                beetle.soldPriceYen != null
                  ? "販売済み"
                  : beetle.isAlive
                  ? beetle.matured
                    ? "生存中 (後食済み)"
                    : "生存中"
                  : "飼育終了"
              }
            />
          </div>
              <button
                onClick={() => {
                  setForm(beetleToForm(beetle, SPECIES_OPTIONS));
                  setEditing(true);
                }}
                className="kuwa-btn-ghost w-full mt-3 py-3 text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
              >
                <Pencil className="w-4 h-4" strokeWidth={2.2} />
                この子の情報を直す
              </button>
              {/* 同じ親から何頭も羽化したとき、種類・産地・累代・親を
                  毎回入れ直すのは骨が折れる */}
              {onDuplicate && (
                <button
                  onClick={() => onDuplicate(beetle)}
                  className="kuwa-btn-ghost w-full mt-2 py-3 text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                >
                  <Copy className="w-4 h-4" strokeWidth={2.2} />
                  この子をもとに登録する
                </button>
              )}
            </>
          )}

          {/* 編集中は、記録や状態を変える操作を伏せる。
              メモが二重に出るうえ、書きかけのまま別の操作に進めてしまうため */}
          {!editing && (
            <>
          {/* 販売記録 */}
          {beetle.soldPriceYen != null ? (
            <div className="bg-[#d7e0b8]/60 rounded-2xl px-4 py-3.5">
              <div className="flex items-center gap-1.5 mb-1">
                <HandCoins className="w-4 h-4 text-[#55682f]" />
                <h3 className="text-sm font-bold text-[#31241a]">販売記録</h3>
              </div>
              <p className="text-lg font-bold text-[#4f5f2a]" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatYen(beetle.soldPriceYen)}
              </p>
              <p className="text-xs text-[#77644b] mt-0.5">
                {beetle.soldDate && formatDate(beetle.soldDate)}
                {beetle.soldTo && ` / 販売先: ${beetle.soldTo}`}
              </p>
              <button
                onClick={() => {
                  updateBeetle(beetle.id, { soldDate: undefined, soldPriceYen: undefined, soldTo: undefined });
                  showToast("販売記録を取り消しました");
                }}
                className="mt-2 text-xs font-semibold text-[#8b7a64] underline"
              >
                販売記録を取り消す
              </button>
            </div>
          ) : showSellForm ? (
            <div className="bg-[#d7e0b8]/60 rounded-2xl p-3.5 space-y-2.5">
              <h3 className="text-sm font-bold text-[#31241a] flex items-center gap-1.5">
                <HandCoins className="w-4 h-4 text-[#55682f]" />
                販売を記録
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={sellForm.date}
                  onChange={(e) => setSellForm({ ...sellForm, date: e.target.value })}
                  className={inputCls}
                />
                <MoneyInput
                  value={sellForm.price}
                  onChange={(v) => setSellForm({ ...sellForm, price: v })}
                  placeholder="販売額"
                />
              </div>
              <input
                value={sellForm.to}
                onChange={(e) => setSellForm({ ...sellForm, to: e.target.value })}
                placeholder="販売先 (店舗・知人など、任意)"
                className={inputCls}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSellForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[rgba(107,68,35,0.16)] text-[#77644b] text-sm font-semibold active:scale-[0.98] transition-all"
                >
                  やめる
                </button>
                <button
                  onClick={() => {
                    if (!sellForm.price) return;
                    updateBeetle(beetle.id, {
                      soldDate: sellForm.date,
                      soldPriceYen: parseInt(sellForm.price),
                      soldTo: sellForm.to || undefined,
                    });
                    setShowSellForm(false);
                    showToast("販売を記録しました！");
                  }}
                  disabled={!sellForm.price}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1 active:scale-[0.98] transition-all ${
                    sellForm.price ? "bg-[#55682f] text-[#fdf6e7] animate-kuwa-pop" : "bg-[#d8c9ae] text-[#8b7a64]"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  記録する
                </button>
              </div>
            </div>
          ) : (
            reminder.showCost && (
            <button
              onClick={() => setShowSellForm(true)}
              className="w-full py-3 rounded-xl border border-emerald-200 text-[#4f5f2a] text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
            >
              <HandCoins className="w-4 h-4" />
              販売を記録する
            </button>
            )
          )}

          {relatedLines.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[#31241a] mb-2">種親として使用中のライン</h3>
              <div className="space-y-1.5">
                {relatedLines.map((l) => (
                  <div key={l.id} className="bg-white border border-[rgba(107,68,35,0.16)] rounded-xl px-3.5 py-2.5 flex justify-between items-center">
                    <span className="text-sm font-semibold text-[#31241a]">{l.name}</span>
                    <span className="text-xs text-[#8b7a64]">{l.species}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {beetle.notes && (
            <div>
              <h3 className="text-sm font-bold text-[#31241a] mb-1.5">メモ</h3>
              <p className="text-sm text-[#77644b] bg-[#f1e7d5] rounded-xl px-3.5 py-3 whitespace-pre-wrap">
                {beetle.notes}
              </p>
            </div>
          )}

          {/* 譲り受けた大きな個体を自分の記録にしたくない人向け。
              ふだんは触らなくてよいので、目立たない場所に置く */}
          {beetle.sizeMm != null && (
            <button
              onClick={() =>
                updateBeetle(beetle.id, { excludeFromRecord: !beetle.excludeFromRecord })
              }
              className="w-full text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
              style={{ color: "var(--kuwa-ink-soft)" }}
            >
              <Trophy className="w-3.5 h-3.5" strokeWidth={2.2} />
              {beetle.excludeFromRecord
                ? "自己ベストに数えていません (もどす)"
                : "自己ベストに数えない"}
            </button>
          )}

          <div className="flex gap-2 pb-2">
            <button
              onClick={handleToggleAlive}
              className="flex-1 py-3 rounded-xl text-sm font-semibold border border-[rgba(107,68,35,0.16)] text-[#77644b] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
            >
              <Skull className="w-4 h-4" />
              {beetle.isAlive ? "飼育終了にする" : "生存中に戻す"}
            </button>
            <button
              onClick={() => (confirmDelete ? handleDelete() : setConfirmDelete(true))}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold border flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all ${
                confirmDelete
                  ? "bg-[#a3502f] text-[#fdf6e7] border-[#a3502f]"
                  : "border-[rgba(163,80,47,0.4)] text-[#a3502f]"
              }`}
            >
              <Trash2 className="w-4 h-4" />
              {confirmDelete ? "ほんとうに消す" : "削除"}
            </button>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
