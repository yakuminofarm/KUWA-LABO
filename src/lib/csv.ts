import { Beetle, BreedingLine, DatePrecision, Larva } from "@/types";
import { STAGE_LABELS, headCount, larvaCost, latestWeight } from "@/lib/breeding";
import { getGenderLabel } from "@/lib/utils";

/**
 * 手持ちの一覧を表計算ソフト向けに書き出す。
 *
 * バックアップ (JSON) とは目的が違う。あちらはくわらぼに戻すためのもので
 * 中身を人が読むようにはできていない。こちらは Numbers や Excel で開いて
 * 眺めたり、店に見せたりするためのもので、読みこみ直すことはできない。
 */

/** 区切り文字や改行、引用符を含む値を安全に包む */
function cell(v: string | number | undefined | null): string {
  if (v == null || v === "") return "";
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const HEADERS = [
  "区分",
  "管理番号",
  "頭数",
  "愛称",
  "種類",
  "産地・血統",
  "累代",
  "性別",
  "ステージ",
  "体長(mm)",
  "体重(g)",
  "出身ライン",
  "孵化・割出日",
  "蛹化日",
  "羽化日",
  "入手日",
  "入手金額(円)",
  "育成費用(円)",
  "後食",
  "状態",
  "販売日",
  "販売金額(円)",
  "販売先",
  "メモ",
];

function beetleRow(b: Beetle, larvae: Larva[]): (string | number | undefined)[] {
  const src = b.sourceLarvaId ? larvae.find((l) => l.id === b.sourceLarvaId) : undefined;
  const state =
    b.soldPriceYen != null ? "販売済み" : b.isAlive ? "飼育中" : "飼育終了";
  return [
    "成虫",
    b.code,
    1,
    b.name,
    b.species,
    b.locality,
    b.generation,
    getGenderLabel(b.gender),
    "成虫",
    b.sizeMm,
    undefined,
    undefined,
    undefined,
    undefined,
    csvDate(b.emergedDate, b.emergedDatePrecision),
    csvDate(b.acquiredDate, b.acquiredDatePrecision),
    b.priceYen,
    src ? larvaCost(src) : undefined,
    b.matured ? "済" : "まだ",
    state,
    b.soldDate,
    b.soldPriceYen,
    b.soldTo,
    b.notes,
  ];
}

function larvaRow(l: Larva, lines: BreedingLine[]): (string | number | undefined)[] {
  const line = l.lineId ? lines.find((x) => x.id === l.lineId) : undefined;
  const group = l.stage === "adult" ? "羽化" : l.stage === "pupa" || l.stage === "prepupa" ? "蛹" : "幼虫";
  return [
    group,
    l.code,
    headCount(l),
    undefined,
    l.species,
    undefined,
    undefined,
    getGenderLabel(l.gender),
    STAGE_LABELS[l.stage],
    l.emergedSizeMm,
    latestWeight(l),
    line?.name,
    csvDate(l.hatchDate, l.hatchDatePrecision),
    l.pupaDate,
    l.emergedDate,
    undefined,
    l.priceYen,
    larvaCost(l),
    undefined,
    l.isAlive ? "飼育中" : "飼育終了",
    undefined,
    undefined,
    undefined,
    l.notes,
  ];
}

/** 月までしか分かっていない日付は "2026-08" のように月までで書き出す */
function csvDate(date?: string, precision?: DatePrecision): string | undefined {
  if (!date) return date;
  return precision === "month" ? date.slice(0, 7) : date;
}

export function buildInventoryCsv(
  beetles: Beetle[],
  larvae: Larva[],
  lines: BreedingLine[]
): string {
  const rows = [
    HEADERS,
    ...beetles.map((b) => beetleRow(b, larvae)),
    ...larvae.map((l) => larvaRow(l, lines)),
  ];
  const body = rows.map((r) => r.map(cell).join(",")).join("\r\n");
  // Excel は BOM が無いと日本語を化けさせる。Numbers は付いていても問題ない
  return "﻿" + body + "\r\n";
}

export function csvFileName(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `kuwarabo-list-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.csv`;
}
