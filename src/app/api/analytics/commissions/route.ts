import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateM2MAuth } from "@/lib/m2m-auth";
import { parseDateRange, parseInterval, toNumber } from "@/lib/query-helpers";

/**
 * GET /api/analytics/commissions
 * Revenue de comisiones de la plataforma a lo largo del tiempo.
 * Un dato clave que solo Payments tiene.
 *
 * Consumido por: Analytics Dashboard
 *
 * Query params:
 *   - from, to: rango de fechas (ISO 8601)
 *   - interval: "day" | "week" | "month" (default: "month")
 */
export async function GET(request: NextRequest) {
  const authError = validateM2MAuth(request, "analytics");
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const dateRange = parseDateRange(searchParams);
    const interval = searchParams.get("interval") as
      | "day"
      | "week"
      | "month"
      | null;
    const effectiveInterval = interval === "day" || interval === "week"
      ? interval
      : "month";

    const where: any = {
      status: { not: "PENDING" },
    };
    if (dateRange) where.createdAt = dateRange;

    const transactions = await db.transaction.findMany({
      where,
      select: {
        commissionAmount: true,
        commissionRate: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Agrupar por intervalo
    const groups = new Map<
      string,
      { commissions: number; transactionCount: number }
    >();

    for (const t of transactions) {
      const key = formatDateKey(t.createdAt, effectiveInterval);
      const existing = groups.get(key) || {
        commissions: 0,
        transactionCount: 0,
      };
      existing.commissions += toNumber(t.commissionAmount);
      existing.transactionCount += 1;
      groups.set(key, existing);
    }

    const data = Array.from(groups.entries()).map(([date, values]) => ({
      date,
      commissions: Math.round(values.commissions * 100) / 100,
      transactionCount: values.transactionCount,
    }));

    const totalCommissions = data.reduce(
      (sum, d) => sum + d.commissions,
      0
    );

    // Tasa de comisión promedio
    const avgCommissionRate =
      transactions.length > 0
        ? transactions.reduce(
            (sum, t) => sum + toNumber(t.commissionRate),
            0
          ) / transactions.length
        : 0;

    return NextResponse.json({
      interval: effectiveInterval,
      data,
      totalCommissions: Math.round(totalCommissions * 100) / 100,
      avgCommissionRate:
        Math.round(avgCommissionRate * 10000) / 100, // e.g., 5.00%
      totalTransactions: transactions.length,
    });
  } catch (error) {
    console.error("[analytics/commissions] Error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "Error al consultar comisiones.",
      },
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
      return d.toISOString().slice(0, 10);
    case "week": {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      return monday.toISOString().slice(0, 10);
    }
    case "month":
      return d.toISOString().slice(0, 7);
  }
}
