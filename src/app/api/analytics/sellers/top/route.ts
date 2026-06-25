import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateM2MAuth } from "@/lib/m2m-auth";
import { parseDateRange, toNumber } from "@/lib/query-helpers";

/**
 * GET /api/analytics/sellers/top
 * Top vendedores por volumen de ventas (revenue).
 * Consumido por: Analytics Dashboard
 *
 * Query params:
 *   - limit: cantidad de resultados (default: 10, max: 50)
 *   - from, to: rango de fechas (ISO 8601)
 */
export async function GET(request: NextRequest) {
  const authError = validateM2MAuth(request, "analytics");
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "10"))
    );
    const dateRange = parseDateRange(searchParams);

    const where: any = {
      status: { not: "PENDING" },
    };
    if (dateRange) where.createdAt = dateRange;

    // Agrupar por sellerId y sumar
    const sellerGroups = await db.transaction.groupBy({
      by: ["sellerId"],
      where,
      _sum: { amount: true, netAmount: true, commissionAmount: true },
      _count: true,
      _avg: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: limit,
    });

    const sellers = sellerGroups.map((g: any) => ({
      sellerId: g.sellerId,
      totalRevenue: Math.round(toNumber(g._sum.amount) * 100) / 100,
      totalNet: Math.round(toNumber(g._sum.netAmount) * 100) / 100,
      totalCommissions: Math.round(
        toNumber(g._sum.commissionAmount) * 100
      ) / 100,
      transactionCount: g._count,
      avgAmount: Math.round(toNumber(g._avg.amount) * 100) / 100,
    }));

    return NextResponse.json({ sellers });
  } catch (error) {
    console.error("[analytics/sellers/top] Error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "Error al consultar top vendedores.",
      },
      { status: 500 }
    );
  }
}
