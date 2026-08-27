"use client";

import { NAV_MASK } from "@/lib/assets";
import { useKuwagataStore } from "@/store/kuwagataStore";

export type KuwagataTabId = "home" | "adults" | "breeding" | "larvae" | "cost" | "articles";

interface KuwagataBottomNavProps {
  activeTab: KuwagataTabId;
  onChange: (tab: KuwagataTabId) => void;
}

const tabs: { id: KuwagataTabId; label: string; mask: string }[] = [
  { id: "home",     label: "ホーム",   mask: NAV_MASK.home },
  { id: "adults",   label: "成虫",     mask: NAV_MASK.adult },
  { id: "breeding", label: "ブリード", mask: NAV_MASK.breeding },
  { id: "larvae",   label: "育成",     mask: NAV_MASK.rearing },
  { id: "cost",     label: "収支",     mask: NAV_MASK.cost },
  { id: "articles", label: "記事",     mask: NAV_MASK.article },
];

/**
 * アイコンは黒1色のPNGをCSSマスクとして使い、背景色で塗り分ける。
 * 画像を色ごとに用意しなくて済み、選択状態の切り替えも色の変更だけで済む。
 */
function TabIcon({ mask, color }: { mask: string; color: string }) {
  return (
    <span
      aria-hidden
      className="block w-[19px] h-[19px] transition-colors"
      style={{
        background: color,
        WebkitMask: `url(${mask}) center/contain no-repeat`,
        mask: `url(${mask}) center/contain no-repeat`,
      }}
    />
  );
}

export function KuwagataBottomNav({ activeTab, onChange }: KuwagataBottomNavProps) {
  const showCost = useKuwagataStore((s) => s.reminder.showCost);
  const visible = showCost ? tabs : tabs.filter((t) => t.id !== "cost");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 max-w-md mx-auto">
      {/* バウンドを抑えきれない端末向けの保険。ナビの下に地色を敷いておき、
          ページが持ち上がっても地の色が続いて見えるようにする。
          ナビ本体の背面ではないので、上のぼかしには影響しない。 */}
      <span
        aria-hidden
        className="absolute top-full left-0 right-0 h-24"
        style={{ background: "var(--kuwa-bark)" }}
      />
      <div
        className="px-2 pb-safe"
        style={{
          background: "rgba(107, 68, 35, 0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(0, 0, 0, 0.14)",
        }}
      >
        <div className="flex">
          {visible.map(({ id, label, mask }) => {
            const isActive = activeTab === id;
            const color = isActive ? "#fdf6e7" : "rgba(253, 246, 231, 0.55)";
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className="flex-1 flex flex-col items-center py-3 gap-1 transition-all duration-200 min-h-[58px]"
              >
                <span
                  className="px-2.5 py-1.5 rounded-xl transition-all duration-200"
                  style={isActive ? { background: "rgba(255, 253, 246, 0.18)" } : undefined}
                >
                  <TabIcon mask={mask} color={color} />
                </span>
                <span
                  className="font-maru text-[10px] font-bold transition-colors"
                  style={{ color }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
