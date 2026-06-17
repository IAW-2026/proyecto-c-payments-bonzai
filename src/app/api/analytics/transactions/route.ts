import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateM2MAuth } from "@/lib/m2m-auth";
import { parseDateRange, toNumber } from "@/lib/query-helpers";

/**
 * GET /api/analytics/transactions
 * Transacciones agrupadas por estado o período.
 * Ideal para gráficos de barra/dona.
 *
 * Consumido por: Analytics Dashboard
 *
 * Query params:
 *   - from, to: rango de fechas (ISO 8601)
 *   - groupBy: "status" | "day" (default: "status")
 */
export async function GET(request: NextRequest) {
  const authError = validateM2MAuth(request, "analytics");
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const dateRange = parseDateRange(searchParams);
    const groupBy = searchParams.get("groupBy") || "status";

    const where: any = {};
    if (dateRange) where.createdAt = dateRange;

    if (groupBy === "status") {
      // Agrupar por estado
      const groups = await db.transaction.groupBy({
        by: ["status"],
        where,
        _count: true,
        _sum: { amount: true },
      });

      const data = groups.map((g: any) => ({
        status: g.status,
        count: g._count,
        volume: Math.round(toNumber(g._sum.amount) * 100) / 100,
      }));

      return NextResponse.json({ groupBy: "status", data });
    } else {
      // Agrupar por día
      const transactions = await db.transaction.findMany({
        where,
        select: {
          status: true,
          amount: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      });

      const groups = new Map<
        string,
        { count: number; volume: number }
      >();

      for (const t of transactions) {
        const key = t.createdAt.toISOString().slice(0, 10);
        const existing = groups.get(key) || { count: 0, volume: 0 };
        existing.count += 1;
        existing.volume += toNumber(t.amount);
        groups.set(key, existing);
      }

      const data = Array.from(groups.entries()).map(([date, values]) => ({
        date,
        count: values.count,
        volume: Math.round(values.volume * 100) / 100,
      }));

      return NextResponse.json({ groupBy: "day", data });
    }
  } catch (error) {
    console.error("[analytics/transactions] Error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "Error al consultar transacciones.",
      },
      { status: 500 }
    );
  }
}
