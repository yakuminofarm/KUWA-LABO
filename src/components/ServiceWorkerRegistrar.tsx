"use client";

import { useEffect } from "react";

/** ホーム画面に置いたときに、電波がなくても開けるようにする */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // オフライン対応は無くても本体は動くので、失敗しても黙って諦める
    });
  }, []);

  return null;
}
