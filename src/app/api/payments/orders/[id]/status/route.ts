import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/payments/orders/[id]/status
 * Consulta el estado de pago de una transacción filtrando por el ID de la Orden (orderId/orderRef).
 * Consumido por: Buyer App / Seller App / Otras integraciones
 *
 * Aquí `id` se interpreta como el `orderId` externo de la orden.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    const transaction = await db.transaction.findUnique({
      where: { orderId },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "TRANSACTION_NOT_FOUND", message: "No se encontró ninguna transacción para el ID de orden provisto." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      transactionId: transaction.id,
      orderRef: transaction.orderId,
      status: transaction.status,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      updatedAt: transaction.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[order-status] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al consultar el estado de la transacción." },
      { status: 500 }
    );
  }
}
