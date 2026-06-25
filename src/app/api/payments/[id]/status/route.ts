import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/payments/[id]/status
 * Consulta el estado de pago de una transacción.
 * Consumido por: Seller App (como fallback/reconciliación)
 *
 * Aquí `id` se interpreta como `transactionId`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: transactionId } = await params;

    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "TRANSACTION_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      transactionId: transaction.id,
      orderRef: transaction.orderId,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      updatedAt: transaction.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[status] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al consultar estado." },
      { status: 500 }
    );
  }
}
