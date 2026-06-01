import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/payments/[id]/delivered
 * Notificación de que el pedido fue entregado.
 * Consumido por: Shipping App / Seller App
 *
 * Aquí `id` se interpreta como `orderId`.
 * Cambia el estado de la transacción a DELIVERED.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();

    const { trackingId, status, deliveredAt } = body;

    // Validaciones
    if (!trackingId || status !== "DELIVERED" || !deliveredAt) {
      return NextResponse.json(
        {
          error: "INVALID_STATUS",
          message:
            "trackingId, status=DELIVERED y deliveredAt son obligatorios.",
        },
        { status: 400 }
      );
    }

    // Buscar transacción en la DB por orderId
    const transaction = await db.transaction.findUnique({
      where: { orderId },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "TRANSACTION_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Solo se puede marcar como DELIVERED si está en HELD
    if (transaction.status !== "HELD") {
      return NextResponse.json(
        {
          error: "INVALID_STATUS",
          message: `No se puede marcar como entregado: estado actual es ${transaction.status}`,
        },
        { status: 400 }
      );
    }

    // Actualizar estado a DELIVERED
    await db.transaction.update({
      where: { id: transaction.id },
      data: { status: "DELIVERED" },
    });

    const disputeWindowDays = parseInt(
      process.env.DISPUTE_WINDOW_DAYS || "7"
    );
    const fundsReleaseDate = new Date(deliveredAt);
    fundsReleaseDate.setDate(
      fundsReleaseDate.getDate() + disputeWindowDays
    );

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      orderId: transaction.orderId,
      newStatus: "DELIVERED",
      fundsReleaseDate: fundsReleaseDate.toISOString(),
      message: `Entrega registrada. Fondos retenidos por ${disputeWindowDays} días de protección.`,
    });
  } catch (error) {
    console.error("[delivered] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al procesar entrega." },
      { status: 500 }
    );
  }
}
