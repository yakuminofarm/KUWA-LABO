"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import { useKuwagataStore } from "@/store/kuwagataStore";
import { useToast } from "@/components/ui/Toast";
import { resolveScan, scanQr } from "@/lib/scan";
import { BeetleDetailModal } from "@/components/BeetleDetailModal";
import { LarvaDetailModal } from "@/components/LarvaDetailModal";

/**
 * ラベルのQRを読んで、その記録を開くボタン。
 *
 * 棚の前でビンを手に持ったまま使うので、追加の＋と同じ高さの左側に置く。
 * 読めたら詳細をここから直接開く — どのタブを見ていても同じように開きたいので、
 * タブの選び直しは通さない。
 */
export function ScanButton() {
  const { beetles, larvae } = useKuwagataStore();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [openBeetleId, setOpenBeetleId] = useState<string | null>(null);
  const [openLarvaId, setOpenLarvaId] = useState<string | null>(null);

  // 開いている間に記録が変わることがあるので、id から引き直す
  const beetle = openBeetleId ? beetles.find((b) => b.id === openBeetleId) : undefined;
  const larva = openLarvaId ? larvae.find((l) => l.id === openLarvaId) : undefined;

  const scan = async () => {
    setBusy(true);
    try {
      const out = await scanQr();
      if (out.kind === "cancelled") return;
      if (out.kind === "failed") {
        showToast("カメラを使えませんでした。設定でカメラの許可を確かめてください", "error");
        return;
      }

      const target = resolveScan(out.text, beetles, larvae);
      switch (target.kind) {
        case "beetle":
          setOpenBeetleId(target.id);
          break;
        case "larva":
          setOpenLarvaId(target.id);
          break;
        case "not-ours":
          showToast("くわらぼのラベルではないようです", "error");
          break;
        case "not-found":
          showToast(
            "この記録は見つかりませんでした。消したか、別の端末のラベルかもしれません",
            "error"
          );
          break;
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={scan}
        disabled={busy}
        aria-label="ラベルのQRを読む"
        className="fixed left-5 w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 z-40 disabled:opacity-60"
        style={{
          bottom: "calc(max(8px, env(safe-area-inset-bottom)) + 76px)",
          background: "var(--kuwa-card)",
          color: "var(--kuwa-bark)",
          border: "1px solid var(--kuwa-line)",
          boxShadow: "0 6px 20px rgba(84, 58, 30, 0.18)",
        }}
      >
        <QrCode className="w-6 h-6" strokeWidth={2.2} />
      </button>

      {beetle && (
        <BeetleDetailModal beetle={beetle} onClose={() => setOpenBeetleId(null)} />
      )}
      {larva && <LarvaDetailModal larva={larva} onClose={() => setOpenLarvaId(null)} />}
    </>
  );
}
