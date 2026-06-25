import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateM2MAuth } from "@/lib/m2m-auth";
import { parseDateRange, toNumber } from "@/lib/query-helpers";

/**
 * GET /api/analytics/disputes
 * Métricas de disputas: tasa, distribución por motivo,
 * tasa de resolución favor comprador vs vendedor, y tiempo promedio de resolución.
 *
 * Consumido por: Analytics Dashboard
 *
 * Query params:
 *   - from, to: rango de fechas (ISO 8601)
 */
export async function GET(request: NextRequest) {
  const authError = validateM2MAuth(request, "analytics");
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const dateRange = parseDateRange(searchParams);

    const where: any = {};
    if (dateRange) where.createdAt = dateRange;

    const [
      totalDisputes,
      resolvedCount,
      byReason,
      byResolution,
      allDisputes,
    ] = await Promise.all([
      db.dispute.count({ where }),
      db.dispute.count({ where: { ...where, resolvedAt: { not: null } } }),
      db.dispute.groupBy({
        by: ["reason"],
        where,
        _count: true,
        orderBy: { _count: { reason: "desc" } },
      }),
      db.dispute.groupBy({
        by: ["resolution"],
        where: { ...where, resolution: { not: null } },
        _count: true,
      }),
      // Para calcular tiempo promedio de resolución
      db.dispute.findMany({
        where: { ...where, resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
      }),
    ]);

    const pendingCount = totalDisputes - resolvedCount;
    const resolutionRate =
      totalDisputes > 0
        ? Math.round((resolvedCount / totalDisputes) * 10000) / 100
        : 0;

    // Tiempo promedio de resolución en horas
    let avgResolutionTimeHours = 0;
    if (allDisputes.length > 0) {
      const totalHours = allDisputes.reduce((sum, d) => {
        const created = new Date(d.createdAt).getTime();
        const resolved = new Date(d.resolvedAt!).getTime();
        return sum + (resolved - created) / (1000 * 60 * 60);
      }, 0);
      avgResolutionTimeHours =
        Math.round((totalHours / allDisputes.length) * 100) / 100;
    }

    // Volumen financiero en disputas
    const disputeVolume = await db.dispute.findMany({
      where,
      include: { transaction: { select: { amount: true } } },
    });
    const totalDisputedAmount = disputeVolume.reduce(
      (sum, d: any) => sum + toNumber(d.transaction?.amount),
      0
    );

    return NextResponse.json({
      totalDisputes,
      resolvedCount,
      pendingCount,
      resolutionRate,
      totalDisputedAmount: Math.round(totalDisputedAmount * 100) / 100,
      avgResolutionTimeHours,
      byReason: byReason.map((r: any) => ({
        reason: r.reason,
        count: r._count,
      })),
      byResolution: byResolution
        .filter((r: any) => r.resolution !== null)
        .map((r: any) => ({
          resolution: r.resolution,
          count: r._count,
        })),
    });
  } catch (error) {
    console.error("[analytics/disputes] Error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "Error al consultar métricas de disputas.",
      },
      { status: 500 }
    );
  }
}
