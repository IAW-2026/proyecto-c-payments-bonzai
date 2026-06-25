import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateM2MAuth } from "@/lib/m2m-auth";
import { toNumber } from "@/lib/query-helpers";

/**
 * GET /api/control-plane/wallets/[userId]
 * Detalle de una wallet específica + sus transacciones recientes
 * y ledger entries asociados.
 * Consumido por: Control Plane
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authError = validateM2MAuth(request, "control-plane");
  if (authError) return authError;

  try {
    const { userId } = await params;

    const wallet = await db.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: "WALLET_NOT_FOUND", message: "Wallet no encontrada para este usuario." },
        { status: 404 }
      );
    }

    // Transacciones recientes donde el usuario es seller
    const recentTransactions = await db.transaction.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        orderId: true,
        buyerId: true,
        amount: true,
        netAmount: true,
        commissionAmount: true,
        status: true,
        createdAt: true,
      },
    });

    // Ledger entries del usuario
    const recentLedgerRaw = await db.ledgerEntry.findMany({
      where: { userId },
      include: {
        transaction: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const recentLedger = recentLedgerRaw
      .filter((e: any) => {
        const isExternalPaymentDebit =
          e.type === "DEBIT" &&
          e.transaction.buyerId === userId &&
          e.transaction.id !== "system-adjustments-txn";
        return !isExternalPaymentDebit;
      })
      .slice(0, 20);

    // Stats agregados
    const transactionStats = await db.transaction.aggregate({
      where: { sellerId: userId },
      _count: true,
      _sum: { amount: true, netAmount: true, commissionAmount: true },
    });

    return NextResponse.json({
      wallet: {
        id: wallet.id,
        userId: wallet.userId,
        availableBalance: toNumber(wallet.availableBalance),
        heldBalance: toNumber(wallet.heldBalance),
        totalBalance:
          toNumber(wallet.availableBalance) + toNumber(wallet.heldBalance),
        updatedAt: wallet.updatedAt.toISOString(),
      },
      stats: {
        totalTransactions: transactionStats._count,
        totalVolume: toNumber(transactionStats._sum.amount),
        totalNetEarnings: toNumber(transactionStats._sum.netAmount),
        totalCommissionsPaid: toNumber(transactionStats._sum.commissionAmount),
      },
      recentTransactions: recentTransactions.map((t: any) => ({
        id: t.id,
        orderId: t.orderId,
        buyerId: t.buyerId,
        amount: toNumber(t.amount),
        netAmount: toNumber(t.netAmount),
        commissionAmount: toNumber(t.commissionAmount),
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
      recentLedger: recentLedger.map((e: any) => ({
        id: e.id,
        transactionId: e.transactionId,
        type: e.type,
        amount: toNumber(e.amount),
        description: e.description,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[control-plane/wallets/[userId]] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al consultar wallet." },
      { status: 500 }
    );
  }
}
