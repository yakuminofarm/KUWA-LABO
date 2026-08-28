"use client";

import { useState } from "react";
import {
  CalendarClock,
  ChevronRight,
  GitBranch,
  JapaneseYen,
  Sparkles,
  UtensilsCrossed,
  Worm,
  BookOpen,
} from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { KuwagataTabId } from "@/components/KuwagataBottomNav";
import { HERO_BG_SRC, NAV_MASK, PUPA_MASK, TOOL_IMAGE } from "@/lib/assets";
import { SectionTitle } from "@/components/KuwaUI";
import { GuideSheet } from "@/components/GuideSheet";
import {
  LINE_STATUS_COLORS,
  LINE_STATUS_LABELS,
  calcCostSummary,
  deriveUpcomingTasks,
  feedingSummary,
  isPupaStage,
  formatYen,
  latestWeight,
  speciesGradient,
  totalHeads,
} from "@/lib/breeding";
import { formatDateShort } from "@/lib/utils";
import { KuwaAppIcon } from "@/components/KuwagataSVG";
import { InstallHint } from "@/components/InstallHint";
import { useToast } from "@/components/ui/Toast";

interface KuwagataHomeTabProps {
  onNavigate: (tab: KuwagataTabId) => void;
}

export function KuwagataHomeTab({ onNavigate }: KuwagataHomeTabProps) {
  const {
    beetles, lines, larvae, expenses, reminder, schedule,
    feedAllToday, toggleFedToday, loadSample, clearSample, hasSample,
  } = useKuwagataStore();
  const [showGuide, setShowGuide] = useState(false);
  // まだ1件も記録がない = 使い始めたばかりの人
  const isEmpty =
    beetles.length === 0 && lines.length === 0 && larvae.length === 0 && expenses.length === 0;
  const sampleLoaded = hasSample();
  const { showToast } = useToast();
  const feeding = feedingSummary(beetles, reminder.intervalDays);

  const aliveBeetles = beetles.filter((b) => b.isAlive && !b.soldDate);
  const aliveLarvae = larvae.filter((l) => l.isAlive && !isPupaStage(l.stage) && l.stage !== "adult");
  const alivePupae = larvae.filter((l) => l.isAlive && isPupaStage(l.stage));
  const activeLines = lines.filter((l) => l.status !== "finished");
  const tasks = deriveUpcomingTasks(lines, larvae, schedule);
  const summary = calcCostSummary(beetles, larvae, expenses);

  const topLarvae = [...larvae]
    .filter((l) => l.isAlive && latestWeight(l) != null)
    .sort((a, b) => (latestWeight(b) ?? 0) - (latestWeight(a) ?? 0))
    .slice(0, 3);

  const dateLabel = new Date().toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  // アイコンは移動先のタブと同じものを使う (同じ意味には同じ絵)
  const stats = [
    { label: "成虫",   value: aliveBeetles.length, unit: "頭", mask: NAV_MASK.adult,    tab: "adults" as const },
    { label: "幼虫",   value: totalHeads(aliveLarvae), unit: "頭", mask: NAV_MASK.rearing,  tab: "larvae" as const },
    { label: "蛹",     value: totalHeads(alivePupae),  unit: "頭", mask: PUPA_MASK,         tab: "larvae" as const },
    { label: "ライン", value: activeLines.length,  unit: "本", mask: NAV_MASK.breeding, tab: "breeding" as const },
  ];

  const cardStyle = {
    background: "var(--kuwa-card)",
    border: "1px solid var(--kuwa-line)",
  };

  if (isEmpty) {
    return (
      <div className="space-y-5">
        <div
          className="rounded-[20px] p-6 text-center kuwa-shadow"
          style={{ background: "var(--kuwa-card)", border: "1px solid var(--kuwa-line)" }}
        >
          <KuwaAppIcon size={64} />
          <h2 className="font-maru text-lg font-bold mt-3.5" style={{ color: "var(--kuwa-ink)" }}>
            くわらぼへようこそ
          </h2>
          <p className="text-sm mt-2.5 leading-relaxed jp-wrap" style={{ color: "var(--kuwa-ink-soft)" }}>
            クワガタの成虫・幼虫・蛹、ブリードの進み具合、エサやり、
            かかったお金までまとめて記録できます。
          </p>
          <button
            onClick={() => onNavigate("adults")}
            className="kuwa-btn-primary w-full mt-4 py-3.5 text-sm active:scale-[0.98] transition-all"
          >
            まずは1頭 登録してみる
          </button>
          <button
            onClick={() => setShowGuide(true)}
            className="kuwa-btn-ghost w-full mt-2 py-3 text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            <BookOpen className="w-4 h-4" strokeWidth={2.2} />
            使い方を見る
          </button>
        </div>

        <div
          className="rounded-2xl p-4"
          style={{ background: "var(--kuwa-bark-bg)", border: "1px solid var(--kuwa-line)" }}
        >
          <p className="font-maru text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
            どんな画面か先に見たい方へ
          </p>
          <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--kuwa-ink-soft)" }}>
            見本の記録を入れて、ひととおり触ってみることができます。あとからまとめて消せます。
          </p>
          <button
            onClick={() => {
              loadSample();
              showToast("見本の記録を入れました");
            }}
            className="kuwa-btn-ghost w-full mt-3 py-3 text-sm active:scale-[0.98] transition-all"
          >
            見本の記録を入れてみる
          </button>
        </div>

        <InstallHint />

        <p className="text-[11px] leading-relaxed px-1" style={{ color: "var(--kuwa-ink-soft)" }}>
          記録はこの端末の中だけに保存されます。他の人には見えません。
        </p>

        {showGuide && <GuideSheet onClose={() => setShowGuide(false)} />}
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <InstallHint />

      {/* 見本が入ったままだと自分の記録と混ざるので、消す道を常に見せておく */}
      {sampleLoaded && (
        <div
          className="rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background: "var(--kuwa-bark-bg)", border: "1px solid var(--kuwa-line)" }}
        >
          <p className="text-xs flex-1 min-w-0" style={{ color: "var(--kuwa-ink-soft)" }}>
            見本の記録が入っています
          </p>
          <button
            onClick={() => {
              const n = clearSample();
              showToast(`見本${n}件を消しました`);
            }}
            className="kuwa-btn-ghost px-4 py-2 text-xs flex-shrink-0 active:scale-95 transition-all"
          >
            消す
          </button>
        </div>
      )}

      {/* ヒーロー: 黒土と樹液 */}
      <div
        className="relative overflow-hidden rounded-[20px] p-6 text-white kuwa-shadow-lg"
        style={{
          backgroundColor: "var(--kuwa-soil)",
          backgroundImage: `url(${HERO_BG_SRC})`,
          backgroundSize: "cover",
          backgroundPosition: "center right",
        }}
      >
        {/* 左半分をさらに暗くして文字を読みやすくする */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(100deg, rgba(26,18,11,0.92) 0%, rgba(26,18,11,0.72) 42%, rgba(26,18,11,0.18) 78%, rgba(26,18,11,0.05) 100%)",
          }}
        />
        <div className="relative">
          <p
            className="font-maru text-[11px] font-bold tracking-wider"
            style={{ color: "var(--kuwa-gold)" }}
          >
            {dateLabel}
          </p>
          <h2 className="font-maru text-[22px] font-bold mt-1.5 leading-snug">
            今日も<span style={{ color: "var(--kuwa-gold)" }}>ブリード日和</span>
          </h2>
          <p
            className="text-xs mt-2"
            style={{ color: "rgba(247,232,203,0.72)", textWrap: "pretty" }}
          >
            {tasks.length > 0
              ? `やることが ${tasks.length}件。忘れないうちにチェックを`
              : "作業予定はありません。ゆっくり観察を楽しみましょう"}
          </p>

          <div className="grid grid-cols-4 gap-2 mt-5">
            {stats.map((s) => (
              <button
                key={s.label}
                onClick={() => onNavigate(s.tab)}
                className="rounded-2xl px-2.5 py-3 text-left active:scale-[0.96] transition-all"
                style={{
                  background: "rgba(224, 166, 63, 0.14)",
                  border: "1px solid rgba(224, 166, 63, 0.28)",
                }}
              >
                <div className="flex items-center gap-1" style={{ color: "var(--kuwa-gold)" }}>
                  <span
                    aria-hidden
                    className="block w-[14px] h-[14px] flex-shrink-0"
                    style={{
                      background: "var(--kuwa-gold)",
                      WebkitMask: `url(${s.mask}) center/contain no-repeat`,
                      mask: `url(${s.mask}) center/contain no-repeat`,
                    }}
                  />
                  <span className="font-maru text-[10px] font-bold whitespace-nowrap">
                    {s.label}
                  </span>
                </div>
                <p
                  className="text-[21px] font-bold mt-1 leading-none"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {s.value}
                  <span
                    className="text-[10px] font-semibold ml-0.5"
                    style={{ color: "rgba(247,232,203,0.6)" }}
                  >
                    {s.unit}
                  </span>
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 今日のエサやり */}
      {feeding.targets.length > 0 && (
        <section>
          <div className="mb-3 px-0.5">
            <div className="flex items-center gap-2">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--kuwa-card)", border: "1px solid var(--kuwa-line)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={TOOL_IMAGE.jelly} alt="" width={22} height={22} />
              </span>
              <h2 className="font-maru text-[15px] font-bold" style={{ color: "var(--kuwa-ink)" }}>
                今日のエサやり
              </h2>
            </div>
          </div>
          <div className="kuwa-card px-5 py-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p
                  className="text-[26px] font-bold leading-none"
                  style={{
                    color: feeding.pending.length === 0 ? "var(--kuwa-moss)" : "var(--kuwa-amber)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {feeding.done}
                  <span className="text-sm font-semibold" style={{ color: "var(--kuwa-ink-soft)" }}>
                    {" / "}
                    {feeding.targets.length}頭
                  </span>
                </p>
                <p className="text-xs mt-1.5" style={{ color: "var(--kuwa-ink-soft)" }}>
                  {feeding.pending.length === 0
                    ? "今日はぜんぶ完了しました。おつかれさまです"
                    : `あと ${feeding.pending.length}頭 にエサをあげましょう`}
                </p>
              </div>
              {feeding.pending.length > 0 && (
                <button
                  onClick={() => {
                    const n = feedAllToday();
                    showToast(`${n}頭にエサをあげました！`);
                  }}
                  className="kuwa-btn-primary px-4 py-3 text-sm flex items-center gap-1.5 flex-shrink-0 active:scale-[0.97] transition-all"
                >
                  <UtensilsCrossed className="w-4 h-4" strokeWidth={2.2} />
                  まとめて
                </button>
              )}
            </div>

            {/* 進み具合 */}
            <div
              className="h-2.5 rounded-full overflow-hidden mt-4"
              style={{ background: "var(--kuwa-bark-bg)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(feeding.done / feeding.targets.length) * 100}%`,
                  background:
                    feeding.pending.length === 0
                      ? "var(--kuwa-moss)"
                      : "linear-gradient(90deg, #c9861f, var(--kuwa-amber))",
                }}
              />
            </div>

            {feeding.pending.length > 0 && (
              <>
                {/* 1頭ずつ済ませたいとき用。多頭飼育だと「まとめて」より
                    こちらのほうが実態に合うことが多い */}
                <div className="flex flex-wrap gap-1.5 mt-3.5">
                  {feeding.pending.slice(0, 8).map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        toggleFedToday(b.id);
                        showToast(`${b.code} にエサをあげました`);
                      }}
                      aria-label={`${b.code} にエサをあげた`}
                      className="kuwa-badge active:scale-90 transition-all"
                      style={{ background: "var(--kuwa-amber-soft)", color: "#8a5410" }}
                    >
                      {b.code}
                    </button>
                  ))}
                  {feeding.pending.length > 8 && (
                    <button
                      onClick={() => onNavigate("adults")}
                      className="kuwa-badge active:scale-90 transition-all"
                      style={{ color: "var(--kuwa-ink-soft)" }}
                    >
                      ほか{feeding.pending.length - 8}頭
                    </button>
                  )}
                </div>
                <p className="text-[11px] mt-2" style={{ color: "var(--kuwa-ink-soft)" }}>
                  番号をタップすると1頭ずつ記録できます
                </p>
              </>
            )}
          </div>
        </section>
      )}

      {/* やること */}
      <section>
        <div className="mb-3 px-0.5">
          <SectionTitle icon={CalendarClock} color="var(--kuwa-amber)">
            やることリスト
          </SectionTitle>
        </div>
        {tasks.length === 0 ? (
          <div className="rounded-2xl p-6 text-center kuwa-shadow" style={cardStyle}>
            <p className="text-sm" style={{ color: "var(--kuwa-ink-soft)" }}>
              今日はおやすみ。次の作業時期が来たらここでお知らせします
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl px-5 py-4 flex items-center gap-4 kuwa-shadow relative overflow-hidden"
                style={{
                  background: "var(--kuwa-card)",
                  border: t.overdue
                    ? "1px solid rgba(163,80,47,0.35)"
                    : "1px solid var(--kuwa-line)",
                }}
              >
                <span
                  className="absolute left-0 top-0 bottom-0 w-[5px]"
                  style={{
                    background: t.overdue
                      ? "var(--kuwa-clay)"
                      : t.kind === "emerge" || t.kind === "digout"
                      ? "var(--kuwa-bark)"
                      : "var(--kuwa-amber)",
                  }}
                />
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-1"
                  style={
                    t.overdue
                      ? { background: "var(--kuwa-clay-bg)", color: "var(--kuwa-clay)" }
                      : t.kind === "emerge" || t.kind === "digout"
                      ? { background: "var(--kuwa-bark-bg)", color: "var(--kuwa-bark)" }
                      : { background: "var(--kuwa-amber-soft)", color: "var(--kuwa-amber)" }
                  }
                >
                  {t.kind === "emerge" || t.kind === "digout" ? (
                    <Sparkles className="w-[18px] h-[18px]" strokeWidth={2.2} />
                  ) : (
                    <CalendarClock className="w-[18px] h-[18px]" strokeWidth={2.2} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate" style={{ color: "var(--kuwa-ink)" }}>
                    {t.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--kuwa-ink-soft)" }}>
                    {t.detail}
                  </p>
                </div>
                {t.overdue && (
                  <span
                    className="font-maru text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: "var(--kuwa-clay)", color: "#fff6ef" }}
                  >
                    そろそろ！
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 進行中ライン */}
      <section>
        <button
          onClick={() => onNavigate("breeding")}
          className="w-full flex items-center justify-between mb-3 px-0.5"
        >
          <SectionTitle icon={GitBranch} color="var(--kuwa-bark)">
            進行中のブリードライン
          </SectionTitle>
          <ChevronRight className="w-4 h-4" style={{ color: "var(--kuwa-bark)", opacity: 0.55 }} />
        </button>
        {activeLines.length === 0 ? (
          <div className="rounded-2xl p-6 text-center kuwa-shadow" style={cardStyle}>
            <p className="text-sm" style={{ color: "var(--kuwa-ink-soft)" }}>
              まだラインがありません。ペアを組んで最初のラインを作ってみましょう
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeLines.map((line) => (
                <div
                  key={line.id}
                  className="rounded-2xl pl-6 pr-5 py-4 flex items-center justify-between gap-3 kuwa-shadow relative overflow-hidden"
                  style={cardStyle}
                >
                  <span
                    className={`absolute left-0 top-0 bottom-0 w-[5px] bg-gradient-to-b ${speciesGradient(line.species)}`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
                      {line.name}
                      <span
                        className="text-xs font-medium ml-2"
                        style={{ color: "var(--kuwa-ink-soft)" }}
                      >
                        {line.species}
                      </span>
                    </p>
                    {line.setDate && (
                      <p className="text-xs mt-1" style={{ color: "var(--kuwa-ink-soft)" }}>
                        セット投入 {formatDateShort(line.setDate)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`kuwa-badge font-maru flex-shrink-0 ${LINE_STATUS_COLORS[line.status]}`}
                  >
                    {LINE_STATUS_LABELS[line.status]}
                  </span>
                </div>
            ))}
          </div>
        )}
      </section>

      {/* 大型候補 */}
      {topLarvae.length > 0 && (
        <section>
          <button
            onClick={() => onNavigate("larvae")}
            className="w-full flex items-center justify-between mb-3 px-0.5"
          >
            <SectionTitle icon={Worm} color="var(--kuwa-moss)">
              大型候補たち
            </SectionTitle>
            <ChevronRight className="w-4 h-4" style={{ color: "var(--kuwa-moss)", opacity: 0.55 }} />
          </button>
          <div className="space-y-3">
            {topLarvae.map((l, i) => (
              <div
                key={l.id}
                className="rounded-2xl px-5 py-4 flex items-center gap-4 kuwa-shadow"
                style={cardStyle}
              >
                <span
                  className="font-maru w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0"
                  style={
                    i === 0
                      ? { background: "linear-gradient(140deg, #e0a63f, #a3660f)", color: "#fffdf6" }
                      : { background: "var(--kuwa-moss)", color: "#fffdf6", opacity: 0.55 }
                  }
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate" style={{ color: "var(--kuwa-ink)" }}>
                    {l.code}
                  </p>
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--kuwa-ink-soft)" }}>
                    {l.species}
                  </p>
                </div>
                <p
                  className="text-xl font-bold flex-shrink-0"
                  style={{ color: "var(--kuwa-moss)", fontVariantNumeric: "tabular-nums" }}
                >
                  {latestWeight(l)}
                  <span className="text-xs font-semibold ml-0.5" style={{ opacity: 0.6 }}>
                    g
                  </span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {reminder.showCost && (
        <>
      {/* 収支: 画面下部の色の重心 */}
      <section className="pb-1">
        <button
          onClick={() => onNavigate("cost")}
          className="w-full rounded-[20px] px-5 py-5 text-left active:scale-[0.98] transition-all kuwa-shadow relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #7a4f26 0%, var(--kuwa-bark) 100%)" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(224,166,63,0.22)", color: "var(--kuwa-gold)" }}
            >
              <JapaneseYen className="w-5 h-5" strokeWidth={2.4} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-maru text-[15px] font-bold" style={{ color: "#fdf6e7" }}>
                収支をみる
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(247,232,203,0.7)" }}>
                つかったお金 {formatYen(summary.totalSpent)}
              </p>
            </div>
            <ChevronRight
              className="w-4 h-4 flex-shrink-0"
              style={{ color: "var(--kuwa-gold)", opacity: 0.7 }}
            />
          </div>
          <div
            className="mt-4 pt-4 flex items-baseline gap-2"
            style={{ borderTop: "1px solid rgba(224,166,63,0.2)" }}
          >
            <span className="text-[11px] font-semibold" style={{ color: "rgba(247,232,203,0.6)" }}>
              販売による売上
            </span>
            <span
              className="text-lg font-bold"
              style={{ color: "var(--kuwa-gold)", fontVariantNumeric: "tabular-nums" }}
            >
              {formatYen(summary.salesTotal)}
            </span>
          </div>
        </button>
      </section>
        </>
      )}
    </div>
  );
}
