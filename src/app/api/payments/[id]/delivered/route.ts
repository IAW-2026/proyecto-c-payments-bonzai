import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/payments/[id]/delivered
 * Notificación de que el pedido global fue entregado.
 * Consumido por: Shipping App
 *
 * Aquí `id` se interpreta como el CheckoutSession ID (transactionId para ellos).
 * Cambia el estado de todas las transacciones de esa sesión a DELIVERED.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: checkoutSessionId } = await params;

    // Validación de seguridad M2M
    const apiKey = request.headers.get("x-shipping-key");
    if (!process.env.SHIPPING_API_KEY || apiKey !== process.env.SHIPPING_API_KEY) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Credenciales de Shipping inválidas." },
        { status: 401 }
      );
    }

    // Buscar sesión en la DB
    const session = await db.checkoutSession.findUnique({
      where: { id: checkoutSessionId },
      include: { transactions: true }
    });

    if (!session) {
      return NextResponse.json(
        { error: "SESSION_NOT_FOUND", message: "No se encontró la sesión de pago." },
        { status: 404 }
      );
    }

    // Verificar si hay transacciones en HELD
    const heldTransactions = session.transactions.filter(t => t.status === "HELD");

    if (heldTransactions.length === 0) {
      return NextResponse.json(
        {
          error: "INVALID_STATUS",
          message: "No hay transacciones en estado HELD listas para ser marcadas como entregadas.",
        },
        { status: 400 }
      );
    }

    // Actualizar estado a DELIVERED solo para las que estaban en HELD
    await db.transaction.updateMany({
      where: { 
        checkoutSessionId,
        status: "HELD" 
      },
      data: { status: "DELIVERED" },
    });

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
      transactionId: session.id,
      updatedCount: heldTransactions.length,
      newStatus: "DELIVERED",
      fundsReleaseDate: fundsReleaseDate.toISOString(),
      message: `Entrega global registrada (${heldTransactions.length} sub-órdenes). Fondos protegidos por ${disputeWindowDays} días.`,
    });
  } catch (error) {
    console.error("[delivered] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al procesar entrega." },
      { status: 500 }
    );
  }
}
