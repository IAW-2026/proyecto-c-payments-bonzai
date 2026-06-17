import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateM2MAuth } from "@/lib/m2m-auth";
import { toNumber } from "@/lib/query-helpers";

/**
 * GET /api/analytics/wallets
 * Distribución de saldos en wallets: total retenido vs disponible,
 * concentración de fondos, y distribución por rangos.
 *
 * Consumido por: Analytics Dashboard
 */
export async function GET(request: NextRequest) {
  const authError = validateM2MAuth(request, "analytics");
  if (authError) return authError;

  try {
    const wallets = await db.wallet.findMany();

    let totalAvailable = 0;
    let totalHeld = 0;
    let zeroBalance = 0;
    let under10k = 0;
    let between10kAnd100k = 0;
    let over100k = 0;

    for (const w of wallets) {
      const available = toNumber(w.availableBalance);
      const held = toNumber(w.heldBalance);
      const total = available + held;

      totalAvailable += available;
      totalHeld += held;

      if (total === 0) {
        zeroBalance++;
      } else if (total < 10000) {
        under10k++;
      } else if (total <= 100000) {
        between10kAnd100k++;
      } else {
        over100k++;
      }
    }

    const totalBalance = totalAvailable + totalHeld;

    // Top 5 wallets por saldo total
    const sortedWallets = wallets
      .map((w) => ({
        userId: w.userId,
        total:
          toNumber(w.availableBalance) + toNumber(w.heldBalance),
        available: toNumber(w.availableBalance),
        held: toNumber(w.heldBalance),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return NextResponse.json({
      totalWallets: wallets.length,
      aggregated: {
        totalAvailable: Math.round(totalAvailable * 100) / 100,
        totalHeld: Math.round(totalHeld * 100) / 100,
        totalBalance: Math.round(totalBalance * 100) / 100,
      },
      distribution: {
        zeroBalance,
        under10k,
        between10kAnd100k,
        over100k,
      },
      topWallets: sortedWallets.map((w) => ({
        userId: w.userId,
        totalBalance: Math.round(w.total * 100) / 100,
        availableBalance: Math.round(w.available * 100) / 100,
        heldBalance: Math.round(w.held * 100) / 100,
      })),
      avgBalance:
        wallets.length > 0
          ? Math.round((totalBalance / wallets.length) * 100) / 100
          : 0,
    });
  } catch (error) {
    console.error("[analytics/wallets] Error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "Error al consultar distribución de wallets.",
      },
      { status: 500 }
    );
  }
}
