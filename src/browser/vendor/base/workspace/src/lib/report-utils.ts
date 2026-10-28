// 보고서 센터 — 기간별 집계 & 내보내기 유틸
import type { Dispatch, Expense, ExpenseKind } from "./fleet-store.ts";
import { expenseLabel } from "./fleet-store.ts";

export type PeriodKind = "today" | "week" | "month" | "custom";

export type Period = {
  kind: PeriodKind;
  from: string; // YYYY-MM-DD (inclusive)
  to: string;   // YYYY-MM-DD (inclusive)
  label: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function buildPeriod(kind: PeriodKind, customFrom?: string, customTo?: string): Period {
  const now = new Date();
  if (kind === "today") {
    const k = dateKey(now);
    return { kind, from: k, to: k, label: "오늘" };
  }
  if (kind === "week") {
    const day = now.getDay(); // 0=일
    const start = new Date(now); start.setDate(now.getDate() - day);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return { kind, from: dateKey(start), to: dateKey(end), label: "이번주" };
  }
  if (kind === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { kind, from: dateKey(start), to: dateKey(end), label: "이번달" };
  }
  return {
    kind: "custom",
    from: customFrom || dateKey(now),
    to: customTo || dateKey(now),
    label: "사용자 지정",
  };
}

export function inRange(date: string, p: Period) {
  return date >= p.from && date <= p.to;
}

export type ReportSummary = {
  count: number;
  revenue: number;
  expense: number;
  net: number;
  avgFare: number;
  distanceKm: number; // 추후 연동
  byCategory: { kind: ExpenseKind; label: string; amount: number }[];
};

export function summarize(dispatches: Dispatch[], expenses: Expense[], p: Period): ReportSummary {
  const completed = dispatches.filter(
    (d) => d.status === "completed" && d.completedAt && inRange(dateKey(new Date(d.completedAt)), p),
  );
  const exps = expenses.filter((e) => inRange(e.date, p));
  const revenue = completed.reduce((a, b) => a + (b.totalFare ?? b.fare ?? 0), 0);
  const expense = exps.reduce((a, b) => a + b.amount, 0);
  const byCatMap = new Map<ExpenseKind, number>();
  for (const e of exps) byCatMap.set(e.kind, (byCatMap.get(e.kind) ?? 0) + e.amount);
  const byCategory = Array.from(byCatMap.entries())
    .map(([kind, amount]) => ({ kind, label: expenseLabel[kind], amount }))
    .sort((a, b) => b.amount - a.amount);
  return {
    count: completed.length,
    revenue,
    expense,
    net: revenue - expense,
    avgFare: completed.length ? Math.round(revenue / completed.length) : 0,
    distanceKm: 0,
    byCategory,
  };
}

export type LedgerRow = {
  date: string;
  type: "운행" | "경비";
  pickup?: string;
  dropoff?: string;
  category?: string;
  amount: number;       // 운임 또는 경비액
  net?: number;         // 운행시 순수익(해당일 운임 - 해당일 경비 안 함, 단순 운임)
  memo?: string;
  vendor?: string;
};

export function buildLedger(
  dispatches: Dispatch[],
  expenses: Expense[],
  p: Period,
): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const d of dispatches) {
    if (d.status !== "completed" || !d.completedAt) continue;
    const date = dateKey(new Date(d.completedAt));
    if (!inRange(date, p)) continue;
    const fare = d.totalFare ?? d.fare ?? 0;
    rows.push({
      date,
      type: "운행",
      pickup: d.pickup,
      dropoff: d.dropoff,
      amount: fare,
      net: fare,
      memo: d.memo,
      vendor: d.pickupCompany || d.dropoffCompany || d.company,
    });
  }
  for (const e of expenses) {
    if (!inRange(e.date, p)) continue;
    rows.push({
      date: e.date,
      type: "경비",
      category: expenseLabel[e.kind],
      amount: e.amount,
      memo: e.memo,
    });
  }
  return rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.type < b.type ? -1 : 1));
}

export const won = (n: number) => (n || 0).toLocaleString("ko-KR");
