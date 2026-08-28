import { DatePrecision } from "@/types";

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export function formatDate(dateString: string, precision?: DatePrecision): string {
  // 月までしか分かっていない日付を「8月1日」と書くと、正確に見えてしまう
  if (precision === "month") {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
    }) + "ごろ";
  }
  return new Date(dateString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

export function getGenderLabel(gender: string): string {
  switch (gender) {
    case "male": return "♂ オス";
    case "female": return "♀ メス";
    default: return "不明";
  }
}
