"use client";

import { useEffect, useState } from "react";
import { KuwagataBottomNav, KuwagataTabId } from "@/components/KuwagataBottomNav";
import { KuwagataHomeTab } from "@/components/tabs/KuwagataHomeTab";
import { AdultTab } from "@/components/tabs/AdultTab";
import { BreedingTab } from "@/components/tabs/BreedingTab";
import { LarvaTab } from "@/components/tabs/LarvaTab";
import { CostTab } from "@/components/tabs/CostTab";
import { ArticlesTab } from "@/components/tabs/ArticlesTab";
import { ForestBackdrop } from "@/components/ForestBackdrop";
import { KuwaAppIcon } from "@/components/KuwagataSVG";
import { FeedingReminder } from "@/components/FeedingReminder";
import { ReminderSheet } from "@/components/ReminderSheet";
import { BackupSheet } from "@/components/BackupSheet";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { DatabaseBackup, Settings } from "lucide-react";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { IS_PRODUCTION } from "@/lib/env";
import { useKuwagataStore } from "@/store/kuwagataStore";

const TAB_TITLES: Record<KuwagataTabId, string> = {
  home: "くわらぼ",
  adults: "成虫管理",
  breeding: "ブリード管理",
  larvae: "育成管理 (幼虫・蛹)",
  cost: "収支管理",
  articles: "読みもの",
};

function StorageFullNotice() {
  const { showToast } = useToast();
  useEffect(() => {
    const onFull = () =>
      showToast("保存できませんでした。写真を何枚か外すと空きが作れます");
    window.addEventListener("kuwa-storage-full", onFull);
    return () => window.removeEventListener("kuwa-storage-full", onFull);
  }, [showToast]);
  return null;
}

export default function KuwagataPage() {
  const [activeTab, setActiveTab] = useState<KuwagataTabId>("home");
  const showCost = useKuwagataStore((s) => s.reminder.showCost);
  // 収支を開いたまま設定で隠すと、行き場のない画面が残る
  const tab: KuwagataTabId = !showCost && activeTab === "cost" ? "home" : activeTab;
  const [showReminder, setShowReminder] = useState(false);
  const [showBackup, setShowBackup] = useState(false);

  return (
    <ToastProvider>
      <StorageFullNotice />
      <FeedingReminder />
      <ServiceWorkerRegistrar />
      <ForestBackdrop />
      <div className="min-h-screen w-full max-w-md mx-auto">
        <header
          className="sticky top-0 z-20 px-4 pb-3.5 flex items-center gap-2.5"
          style={{
            background: "rgba(107, 68, 35, 0.95)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(0, 0, 0, 0.14)",
            // ホーム画面から開いたとき、時計の帯の下に潜らせる
            paddingTop: "calc(env(safe-area-inset-top) + 14px)",
          }}
        >
          <KuwaAppIcon size={36} onDark />
          <h1 className="font-maru text-lg font-bold flex-1 min-w-0 truncate" style={{ color: "#fdf6e7" }}>
            {TAB_TITLES[tab]}
          </h1>
          {/* テスト用の配信だと一目で分かるようにする。
              記録は配信ごとに別なので、間違えたまま入力すると行方が分からなくなる */}
          {!IS_PRODUCTION && (
            <span
              className="kuwa-badge font-maru flex-shrink-0"
              style={{ background: "#f0d49b", color: "#6b4423" }}
            >
              テスト
            </span>
          )}
          <button
            onClick={() => setShowBackup(true)}
            aria-label="データの持ち出し"
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-90 transition-all"
            style={{
              background: "rgba(255, 253, 246, 0.18)",
              color: "#f2ead6",
              border: "1px solid rgba(253, 246, 231, 0.3)",
            }}
          >
            <DatabaseBackup className="w-[18px] h-[18px]" strokeWidth={2.2} />
          </button>
          <button
            onClick={() => setShowReminder(true)}
            aria-label="設定"
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-90 transition-all"
            style={{
              background: "rgba(255, 253, 246, 0.18)",
              color: "#f2ead6",
              border: "1px solid rgba(253, 246, 231, 0.3)",
            }}
          >
            <Settings className="w-[18px] h-[18px]" strokeWidth={2.2} />
          </button>
        </header>

        {/* 下余白は「ナビの高さ」ではなく「追加ボタンの上端」に合わせる。
            ボタンは下から safe+76px の位置に高さ56pxで浮いているので、
            96px では最後のカードが必ず潜り込む。76+56+余白16 で 148px。 */}
        <main
          className="px-4 pt-5"
          style={{ paddingBottom: "calc(max(8px, env(safe-area-inset-bottom)) + 148px)" }}
        >
          {tab === "home" && (
            <KuwagataHomeTab onNavigate={setActiveTab} />
          )}
          {tab === "adults" && <AdultTab />}
          {tab === "breeding" && <BreedingTab />}
          {tab === "larvae" && <LarvaTab />}
          {tab === "cost" && <CostTab />}
          {tab === "articles" && <ArticlesTab />}
        </main>

        <KuwagataBottomNav activeTab={tab} onChange={setActiveTab} />

        {showReminder && <ReminderSheet onClose={() => setShowReminder(false)} />}
        {showBackup && <BackupSheet onClose={() => setShowBackup(false)} />}
      </div>
    </ToastProvider>
  );
}
