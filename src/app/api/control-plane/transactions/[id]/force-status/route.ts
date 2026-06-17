import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateM2MAuth } from "@/lib/m2m-auth";

/**
 * PATCH /api/control-plane/transactions/[id]/force-status
 * Forzar cambio de estado de una transacción.
 * Consumido por: Control Plane (para resolución de disputas o correcciones manuales)
 *
 * Body:
 *   - status: nuevo estado (PENDING, HELD, DELIVERED, COMPLETED, DISPUTED, REFUNDED)
 *   - reason: motivo del cambio (obligatorio, para auditoría)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateM2MAuth(request, "control-plane");
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, reason } = body;

    const validStatuses = [
      "PENDING",
      "HELD",
      "DELIVERED",
      "COMPLETED",
      "DISPUTED",
      "REFUNDED",
    ];

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: "INVALID_STATUS",
          message: `El estado debe ser uno de: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        {
          error: "MISSING_REASON",
          message: "El motivo del cambio es obligatorio para auditoría.",
        },
        { status: 400 }
      );
    }

    const transaction = await db.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "TRANSACTION_NOT_FOUND", message: "Transacción no encontrada." },
        { status: 404 }
      );
    }

    const previousStatus = transaction.status;

    // Actualizar estado
    await db.transaction.update({
      where: { id },
      data: { status },
    });

    // Registrar en el libro mayor como auditoría
    await db.ledgerEntry.create({
      data: {
        userId: "control-plane",
        transactionId: transaction.id,
        type: "DEBIT", // Entrada de auditoría, no financiera
        amount: 0,
        description: `[FORCE-STATUS] ${previousStatus} → ${status} — ${reason}`,
      },
    });

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      previousStatus,
      newStatus: status,
      reason,
      message: `Estado cambiado de ${previousStatus} a ${status}.`,
    });
  } catch (error) {
    console.error("[control-plane/transactions/[id]/force-status] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al forzar cambio de estado." },
      { status: 500 }
    );
  }
}
