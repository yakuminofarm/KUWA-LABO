"use client";

import { useEffect } from "react";

/**
 * ホーム画面に置いたときに、電波がなくても開けるようにする。
 *
 * あわせて更新の受け取りも見る。オフライン用に画面を端末へ保存しているぶん、
 * 放っておくと古い画面のまま何日も気づけない。開くたび・戻るたびに新しい
 * 中身が出ていないか確かめ、入れ替わったら読み直す。
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let reloading = false;
    let pending = false;

    /**
     * 入力の途中で読み直すと書きかけが消える。
     * シートが開いている間や文字を打っている間は待つ。
     */
    const busy = () => {
      if (document.querySelector(".kuwa-sheet")) return true;
      const el = document.activeElement;
      return !!el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
    };

    const reload = () => {
      if (reloading || !pending) return;
      if (busy()) return; // 手が空いたら下の visibilitychange で拾い直す
      reloading = true;
      window.location.reload();
    };

    const onControllerChange = () => {
      pending = true;
      reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (pending) {
        reload();
        return;
      }
      // 戻ってきたタイミングで、新しい中身が出ていないか確かめる
      navigator.serviceWorker
        .getRegistration()
        .then((r) => r?.update())
        .catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);

    navigator.serviceWorker
      .register("/sw.js")
      .then((r) => r.update())
      .catch(() => {
        // オフライン対応は無くても本体は動くので、失敗しても黙って諦める
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
