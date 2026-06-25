import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateM2MAuth } from "@/lib/m2m-auth";
import { parseDateRange, parseInterval, toNumber } from "@/lib/query-helpers";

/**
 * GET /api/analytics/revenue
 * Revenue (volumen de transacciones) agrupado por intervalo temporal.
 * Ideal para gráficos de línea.
 *
 * Consumido por: Analytics Dashboard
 *
 * Query params:
 *   - from, to: rango de fechas (ISO 8601)
 *   - interval: "day" | "week" | "month" (default: "day")
 */
export async function GET(request: NextRequest) {
  const authError = validateM2MAuth(request, "analytics");
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const dateRange = parseDateRange(searchParams);
    const interval = parseInterval(searchParams);

    // Filtro base: solo transacciones pagadas (no PENDING)
    const where: any = {
      status: { not: "PENDING" },
    };
    if (dateRange) where.createdAt = dateRange;

    // Obtener todas las transacciones filtradas
    const transactions = await db.transaction.findMany({
      where,
      select: {
        amount: true,
        commissionAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Agrupar por intervalo
    const groups = new Map<
      string,
      { revenue: number; commissions: number; count: number }
    >();

    for (const t of transactions) {
      const key = formatDateKey(t.createdAt, interval);
      const existing = groups.get(key) || {
        revenue: 0,
        commissions: 0,
        count: 0,
      };
      existing.revenue += toNumber(t.amount);
      existing.commissions += toNumber(t.commissionAmount);
      existing.count += 1;
      groups.set(key, existing);
    }

    const data = Array.from(groups.entries()).map(([date, values]) => ({
      date,
      revenue: Math.round(values.revenue * 100) / 100,
      commissions: Math.round(values.commissions * 100) / 100,
      count: values.count,
    }));

    const totals = data.reduce(
      (acc, d) => ({
        revenue: acc.revenue + d.revenue,
        commissions: acc.commissions + d.commissions,
        count: acc.count + d.count,
      }),
      { revenue: 0, commissions: 0, count: 0 }
    );

    return NextResponse.json({
      interval,
      data,
      totals: {
        revenue: Math.round(totals.revenue * 100) / 100,
        commissions: Math.round(totals.commissions * 100) / 100,
        count: totals.count,
      },
    });
  } catch (error) {
    console.error("[analytics/revenue] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al consultar revenue." },
      { status: 500 }
    );
  }
}

function formatDateKey(
  date: Date,
  interval: "day" | "week" | "month"
): string {
  const d = new Date(date);
  switch (interval) {
    case "day":
      return d.toISOString().slice(0, 10); // "2026-06-14"
    case "week": {
      // ISO week: Monday-based
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      return monday.toISOString().slice(0, 10); // Monday of the week
    }
    case "month":
      return d.toISOString().slice(0, 7); // "2026-06"
  }
}
