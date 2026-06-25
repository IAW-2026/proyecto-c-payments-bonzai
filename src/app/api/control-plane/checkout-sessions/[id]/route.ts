import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateM2MAuth } from "@/lib/m2m-auth";
import { toNumber } from "@/lib/query-helpers";

/**
 * GET /api/control-plane/checkout-sessions/[id]
 * Detalle completo de un checkout session:
 * transacciones hijas, pagos de MercadoPago, estado de cada sub-orden.
 *
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

    const session = await db.checkoutSession.findUnique({
      where: { id },
      include: {
        transactions: {
          include: {
            dispute: {
              select: { id: true, reason: true, resolution: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        payments: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        {
          error: "SESSION_NOT_FOUND",
          message: "Checkout session no encontrada.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: session.id,
      buyerId: session.buyerId,
      totalAmount: toNumber(session.totalAmount),
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      transactions: session.transactions.map((t: any) => ({
        id: t.id,
        orderId: t.orderId,
        sellerId: t.sellerId,
        amount: toNumber(t.amount),
        commissionAmount: toNumber(t.commissionAmount),
        netAmount: toNumber(t.netAmount),
        status: t.status,
        currency: t.currency,
        hasDispute: !!t.dispute,
        dispute: t.dispute
          ? {
              id: t.dispute.id,
              reason: t.dispute.reason,
              resolution: t.dispute.resolution,
            }
          : null,
        createdAt: t.createdAt.toISOString(),
      })),
      payments: session.payments.map((p: any) => {
        let checkoutUrl = p.checkoutUrl;
        if (checkoutUrl) {
          try {
            const parsed = new URL(checkoutUrl);
            if (parsed.hostname.includes("mercadopago.com")) {
              parsed.hostname = "sandbox.mercadopago.com.ar";
              checkoutUrl = parsed.toString();
            }
          } catch {
            checkoutUrl = checkoutUrl
              .replace("www.mercadopago.com.ar", "sandbox.mercadopago.com.ar")
              .replace("www.mercadopago.com", "sandbox.mercadopago.com.ar");
          }
        }
        return {
          id: p.id,
          provider: p.provider,
          providerStatus: p.providerStatus,
          externalId: p.externalId,
          preferenceId: p.preferenceId,
          checkoutUrl,
          createdAt: p.createdAt.toISOString(),
        };
      }),
      summary: {
        transactionCount: session.transactions.length,
        uniqueSellers: [
          ...new Set(session.transactions.map((t: any) => t.sellerId)),
        ].length,
        totalCommissions: session.transactions.reduce(
          (sum: number, t: any) => sum + toNumber(t.commissionAmount),
          0
        ),
        totalNet: session.transactions.reduce(
          (sum: number, t: any) => sum + toNumber(t.netAmount),
          0
        ),
        statusBreakdown: session.transactions.reduce(
          (acc: any, t: any) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    });
  } catch (error) {
    console.error("[control-plane/checkout-sessions/[id]] Error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "Error al consultar checkout session.",
      },
      { status: 500 }
    );
  }
}
