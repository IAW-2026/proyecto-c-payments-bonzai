import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateM2MAuth } from "@/lib/m2m-auth";
import { toNumber } from "@/lib/query-helpers";

/**
 * POST /api/control-plane/transactions/[id]/release-funds
 * Liberación manual de escrow: mueve fondos de DELIVERED → COMPLETED
 * y transfiere saldo de heldBalance a availableBalance en la wallet del vendedor.
 *
 * Resuelve la limitación conocida del proyecto (transición DELIVERED → COMPLETED faltante).
 *
 * Consumido por: Control Plane
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateM2MAuth(request, "control-plane");
  if (authError) return authError;

  try {
    const { id } = await params;

    const transaction = await db.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "TRANSACTION_NOT_FOUND", message: "Transacción no encontrada." },
        { status: 404 }
      );
    }

    if (transaction.status !== "DELIVERED") {
      return NextResponse.json(
        {
          error: "INVALID_STATUS",
          message: `Solo se pueden liberar fondos de transacciones en estado DELIVERED. Estado actual: ${transaction.status}`,
        },
        { status: 400 }
      );
    }

    const netAmount = transaction.netAmount;

    // Ejecutar todo en una transacción atómica de base de datos
    await db.$transaction(async (tx) => {
      // 1. Actualizar transacción a COMPLETED
      await tx.transaction.update({
        where: { id },
        data: { status: "COMPLETED" },
      });

      // 2. Mover fondos de heldBalance a availableBalance
      await tx.wallet.update({
        where: { userId: transaction.sellerId },
        data: {
          heldBalance: { decrement: netAmount },
          availableBalance: { increment: netAmount },
        },
      });

      // 3. También actualizar la CheckoutSession si todas sus transacciones son COMPLETED
      const siblingTransactions = await tx.transaction.findMany({
        where: { checkoutSessionId: transaction.checkoutSessionId },
      });

      const allCompleted = siblingTransactions.every(
        (t: any) => t.id === transaction.id || t.status === "COMPLETED"
      );

      if (allCompleted) {
        await tx.checkoutSession.update({
          where: { id: transaction.checkoutSessionId },
          data: { status: "COMPLETED" },
        });
      }
    });

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      orderId: transaction.orderId,
      sellerId: transaction.sellerId,
      newStatus: "COMPLETED",
      releasedAmount: toNumber(netAmount),
      message: "Fondos liberados al vendedor.",
    });
  } catch (error) {
    console.error(
      "[control-plane/transactions/[id]/release-funds] Error:",
      error
    );
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al liberar fondos." },
      { status: 500 }
    );
  }
}
