import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateM2MAuth } from "@/lib/m2m-auth";
import { toNumber } from "@/lib/query-helpers";

/**
 * GET /api/analytics/overview
 * KPIs globales del sistema financiero en una sola llamada.
 * Consumido por: Analytics Dashboard
 */
export async function GET(request: NextRequest) {
  const authError = validateM2MAuth(request, "analytics");
  if (authError) return authError;

  try {
    const [
      totalTransactions,
      volumeResult,
      commissionResult,
      totalDisputes,
      activeDisputes,
      activeWallets,
      statusCounts,
    ] = await Promise.all([
      // Total transacciones
      db.transaction.count({
        where: { status: { not: "PENDING" } },
      }),
      // Volumen total
      db.transaction.aggregate({
        where: { status: { not: "PENDING" } },
        _sum: { amount: true },
        _avg: { amount: true },
      }),
      // Comisiones totales
      db.transaction.aggregate({
        where: { status: { not: "PENDING" } },
        _sum: { commissionAmount: true },
      }),
      // Total disputas
      db.dispute.count(),
      // Disputas activas (sin resolver)
      db.dispute.count({ where: { resolvedAt: null } }),
      // Wallets activas
      db.wallet.count(),
      // Conteo por estado
      db.transaction.groupBy({
        by: ["status"],
        _count: true,
      }),
    ]);

    const totalVolume = toNumber(volumeResult._sum.amount);
    const avgAmount = toNumber(volumeResult._avg.amount);
    const totalCommissions = toNumber(commissionResult._sum.commissionAmount);

    // Construir breakdown de estados
    const statusBreakdown: Record<string, number> = {};
    for (const sc of statusCounts) {
      statusBreakdown[sc.status] = sc._count;
    }

    // Tasa de disputas
    const disputeRate =
      totalTransactions > 0
        ? Math.round((totalDisputes / totalTransactions) * 10000) / 100
        : 0;

    return NextResponse.json({
      totalTransactions,
      totalVolume: Math.round(totalVolume * 100) / 100,
      totalCommissions: Math.round(totalCommissions * 100) / 100,
      totalDisputes,
      activeDisputes,
      disputeRate,
      activeWallets,
      avgTransactionAmount: Math.round(avgAmount * 100) / 100,
      statusBreakdown,
    });
  } catch (error) {
    console.error("[analytics/overview] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al consultar KPIs." },
      { status: 500 }
    );
  }
}
