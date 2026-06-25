import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/payments/[id]/delivered
 * Notificación de que una orden específica fue entregada.
 * Consumido por: Shipping App
 *
 * Aquí `id` se interpreta como el `orderId` externo de la transacción.
 * Cambia el estado de esa transacción específica a DELIVERED y actualiza la sesión de checkout si todas sus transacciones coinciden.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    // Validación de seguridad M2M
    const apiKey = request.headers.get("x-shipping-key");
    if (!process.env.SHIPPING_API_KEY || apiKey !== process.env.SHIPPING_API_KEY) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Credenciales de Shipping inválidas." },
        { status: 401 }
      );
    }

    // Buscar transacción por orderId
    const transaction = await db.transaction.findUnique({
      where: { orderId },
      include: {
        checkoutSession: {
          include: {
            transactions: true
          }
        }
      }
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "TRANSACTION_NOT_FOUND", message: "No se encontró la transacción para el ID de orden provisto." },
        { status: 404 }
      );
    }

    if (transaction.status !== "HELD") {
      return NextResponse.json(
        {
          error: "INVALID_STATUS",
          message: `La transacción no está en estado HELD. Estado actual: ${transaction.status}`,
        },
        { status: 400 }
      );
    }

    // Actualizar transacción a DELIVERED
    await db.transaction.update({
      where: { id: transaction.id },
      data: { status: "DELIVERED" },
    });

    const checkoutSession = transaction.checkoutSession;
    const siblingTransactions = checkoutSession.transactions;

    // Verificar si todas las transacciones de la sesión ya fueron entregadas o pasaron a un estado terminal
    // (es decir, no queda ninguna en HELD o PENDING)
    const hasRemainingPendingOrHeld = siblingTransactions.some(
      (t) => t.id !== transaction.id && ["PENDING", "HELD"].includes(t.status)
    );

    if (!hasRemainingPendingOrHeld) {
      await db.checkoutSession.update({
        where: { id: checkoutSession.id },
        data: { status: "DELIVERED" },
      });
    }

    const disputeWindowDays = parseInt(
      process.env.DISPUTE_WINDOW_DAYS || "7"
    );
    const deliveredAt = new Date();
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
      message: `Entrega registrada para la orden ${transaction.orderId}. Fondos protegidos por ${disputeWindowDays} días.`,
    });
  } catch (error) {
    console.error("[delivered] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al procesar entrega." },
      { status: 500 }
    );
  }
}
