"use client";

import { useState } from "react";
import { BookOpen, CalendarDays, Clock, Compass, ExternalLink as ExternalLinkIcon } from "lucide-react";
import {
  ARTICLES,
  ARTICLE_CATEGORIES,
  Article,
  ArticleCategory,
  EXTERNAL_LINKS,
  MONTHLY_TOPICS,
} from "@/lib/articles";
import { SectionTitle, Sheet } from "@/components/KuwaUI";

type CategoryFilter = "all" | ArticleCategory;

const CATEGORY_COLORS: Record<ArticleCategory, string> = {
  "基礎":       "bg-[#e4dbc9] text-[#6f6250]",
  "産卵":       "bg-[#eccfc2] text-[#94472a]",
  "幼虫飼育":   "bg-[#d7e0b8] text-[#55682f]",
  "温度管理":   "bg-[#cfdbdd] text-[#456367]",
  "羽化・成虫": "bg-[#e6cfa8] text-[#7a4f1e]",
  "販売":       "bg-[#f0d49b] text-[#a3660f]",
};

function ArticleReader({ article, onClose }: { article: Article; onClose: () => void }) {
  return (
    <Sheet
      title={article.title}
      badge={
        <span className={`kuwa-badge font-maru flex-shrink-0 ${CATEGORY_COLORS[article.category]}`}>
          {article.category}
        </span>
      }
      onClose={onClose}
    >
      <p
        className="text-sm font-semibold rounded-2xl px-4 py-4 leading-relaxed"
        style={{
          background: "var(--kuwa-amber-soft)",
          color: "#6b4423",
          textWrap: "pretty",
        }}
      >
        {article.lead}
      </p>
      <div className="space-y-4">
        {article.body.map((para, i) => (
          <p
            key={i}
            className="text-[15px] leading-[1.95]"
            style={{ color: "var(--kuwa-ink)", textWrap: "pretty" }}
          >
            {para}
          </p>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 pb-4">
        {article.tags.map((t) => (
          <span
            key={t}
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "var(--kuwa-bark-bg)", color: "var(--kuwa-bark)" }}
          >
            #{t}
          </span>
        ))}
      </div>
    </Sheet>
  );
}

export function ArticlesTab() {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [selected, setSelected] = useState<Article | null>(null);

  const month = new Date().getMonth() + 1;
  const topics = MONTHLY_TOPICS[month] ?? [];

  const filtered =
    category === "all" ? ARTICLES : ARTICLES.filter((a) => a.category === category);

  return (
    <div className="space-y-7">
      {/* 今月のトピック */}
      <div
        className="rounded-[20px] p-6 kuwa-shadow-lg"
        style={{
          background:
            "radial-gradient(120% 90% at 15% 0%, #5c4022 0%, #3a2917 45%, var(--kuwa-soil) 100%)",
        }}
      >
        <div className="flex items-center gap-2" style={{ color: "var(--kuwa-gold)" }}>
          <CalendarDays className="w-4 h-4" strokeWidth={2.4} />
          <p className="font-maru text-[11px] font-bold tracking-wider">
            {month}月にやっておきたいこと
          </p>
        </div>
        <div className="mt-4 space-y-4">
          {topics.map((t, i) => (
            <div key={i} className="flex gap-3.5">
              <span
                className="font-maru w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "rgba(224,166,63,0.2)", color: "var(--kuwa-gold)" }}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold" style={{ color: "#fdf6e7" }}>
                  {t.title}
                </p>
                <p
                  className="text-xs mt-1 leading-relaxed"
                  style={{ color: "rgba(247,232,203,0.66)", textWrap: "pretty" }}
                >
                  {t.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 飼育コラム */}
      <section>
        <div className="mb-3 px-0.5">
          <SectionTitle icon={BookOpen} color="var(--kuwa-amber)">
            飼育コラム
          </SectionTitle>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 mb-3">
          {(["all", ...ARTICLE_CATEGORIES] as CategoryFilter[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              data-on={category === c}
              className="kuwa-chip kuwa-chip-amber font-maru"
            >
              {c === "all" ? "すべて" : c}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className="kuwa-card w-full text-left p-5 transition-all active:scale-[0.98] animate-slide-up"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span
                  className={`kuwa-badge font-maru flex-shrink-0 ${CATEGORY_COLORS[a.category]}`}
                >
                  {a.category}
                </span>
                <span
                  className="text-[11px] flex items-center gap-1"
                  style={{ color: "var(--kuwa-ink-soft)" }}
                >
                  <Clock className="w-3 h-3" strokeWidth={2.2} />
                  {a.readMinutes}分で読めます
                </span>
              </div>
              <p
                className="font-maru jp-wrap text-[15px] font-bold leading-snug"
                style={{ color: "var(--kuwa-ink)", textWrap: "balance" }}
              >
                {a.title}
              </p>
              <p
                className="text-xs mt-2 leading-relaxed line-clamp-2"
                style={{ color: "var(--kuwa-ink-soft)" }}
              >
                {a.lead}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* 外部リンク */}
      <section className="pb-2">
        <div className="mb-2 px-0.5">
          <SectionTitle icon={Compass} color="var(--kuwa-bark)">
            もっと知りたいとき
          </SectionTitle>
        </div>
        <p className="text-xs mb-3 px-1" style={{ color: "var(--kuwa-ink-soft)" }}>
          最新のニュースや相場は外部サイトで。タップで検索が開きます。
        </p>
        <div className="kuwa-card overflow-hidden">
          {EXTERNAL_LINKS.map((l, i) => (
            <a
              key={l.label}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-4 transition-colors"
              style={i > 0 ? { borderTop: "1px solid var(--kuwa-line)" } : undefined}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold" style={{ color: "var(--kuwa-ink)" }}>
                  {l.label}
                </p>
                <p className="text-xs truncate mt-0.5" style={{ color: "var(--kuwa-ink-soft)" }}>
                  {l.description}
                </p>
              </div>
              <ExternalLinkIcon
                className="w-4 h-4 flex-shrink-0"
                strokeWidth={2.2}
                style={{ color: "#b3a189" }}
              />
            </a>
          ))}
        </div>
      </section>

      {selected && <ArticleReader article={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
