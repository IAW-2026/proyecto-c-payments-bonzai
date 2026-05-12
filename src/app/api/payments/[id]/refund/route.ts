import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/payments/[id]/refund
 * Ejecuta un reembolso completo (solo admin).
 * Consumido por: Panel Admin / Control Plane
 *
 * Aquí `id` se interpreta como `orderId`.
 */
export async function POST(
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
        { error: "TRANSACTION_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!["HELD", "DELIVERED"].includes(transaction.status)) {
      return NextResponse.json(
        {
          error: "INVALID_STATUS",
          message: `No se puede reembolsar: estado actual es ${transaction.status}`,
        },
        { status: 400 }
      );
    }

    // Actualizar transacción
    await db.transaction.update({
      where: { id: transaction.id },
      data: { status: "REFUNDED" },
    });

    // Ajustar wallet del vendedor
    await db.wallet.update({
      where: { userId: transaction.sellerId },
      data: {
        heldBalance: { decrement: transaction.netAmount },
      },
    });

    // Registrar en libro mayor
    await db.ledgerEntry.create({
      data: {
        userId: transaction.buyerId,
        transactionId: transaction.id,
        type: "CREDIT",
        amount: transaction.amount,
        description: `Reembolso completo — ${transaction.orderId}`,
      },
    });
    await db.ledgerEntry.create({
      data: {
        userId: transaction.sellerId,
        transactionId: transaction.id,
        type: "DEBIT",
        amount: transaction.netAmount,
        description: `Cargo por reembolso — ${transaction.orderId}`,
      },
    });

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      newStatus: "REFUNDED",
      message: "Reembolso procesado exitosamente.",
    });
  } catch (error) {
    console.error("[refund] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al procesar reembolso." },
      { status: 500 }
    );
  }
}
