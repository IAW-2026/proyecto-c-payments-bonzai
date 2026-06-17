import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateM2MAuth } from "@/lib/m2m-auth";
import { toNumber } from "@/lib/query-helpers";

/**
 * GET /api/control-plane/transactions/[id]
 * Detalle completo de una transacción, incluyendo disputa,
 * ledger entries y datos del checkout session.
 * Consumido por: Control Plane
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateM2MAuth(request, "control-plane");
  if (authError) return authError;

  try {
    const { id } = await params;

    const transaction = await db.transaction.findUnique({
      where: { id },
      include: {
        dispute: true,
        ledgerEntries: {
          orderBy: { createdAt: "desc" },
        },
        checkoutSession: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "TRANSACTION_NOT_FOUND", message: "Transacción no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: transaction.id,
      checkoutSessionId: transaction.checkoutSessionId,
      orderId: transaction.orderId,
      buyerId: transaction.buyerId,
      sellerId: transaction.sellerId,
      amount: toNumber(transaction.amount),
      commissionRate: toNumber(transaction.commissionRate),
      commissionAmount: toNumber(transaction.commissionAmount),
      netAmount: toNumber(transaction.netAmount),
      status: transaction.status,
      currency: transaction.currency,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
      dispute: transaction.dispute
        ? {
            id: transaction.dispute.id,
            reason: transaction.dispute.reason,
            description: transaction.dispute.description,
            resolution: transaction.dispute.resolution,
            resolutionNotes: transaction.dispute.resolutionNotes,
            refundAmount: transaction.dispute.refundAmount
              ? toNumber(transaction.dispute.refundAmount)
              : null,
            createdAt: transaction.dispute.createdAt.toISOString(),
            resolvedAt: transaction.dispute.resolvedAt
              ? transaction.dispute.resolvedAt.toISOString()
              : null,
          }
        : null,
      ledgerEntries: transaction.ledgerEntries.map((e: any) => ({
        id: e.id,
        userId: e.userId,
        type: e.type,
        amount: toNumber(e.amount),
        description: e.description,
        createdAt: e.createdAt.toISOString(),
      })),
      checkoutSession: {
        id: transaction.checkoutSession.id,
        buyerId: transaction.checkoutSession.buyerId,
        totalAmount: toNumber(transaction.checkoutSession.totalAmount),
        status: transaction.checkoutSession.status,
        createdAt: transaction.checkoutSession.createdAt.toISOString(),
        payments: transaction.checkoutSession.payments.map((p: any) => ({
          id: p.id,
          provider: p.provider,
          providerStatus: p.providerStatus,
          externalId: p.externalId,
          createdAt: p.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("[control-plane/transactions/[id]] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al consultar transacción." },
      { status: 500 }
    );
  }
}
