import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

/**
 * POST /api/payments/[id]/dispute
 * Abre una disputa sobre una transacción.
 * Consumido por: Buyer App
 *
 * Aquí `id` se interpreta como `orderId`.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const { reason, description } = body;

    if (!reason) {
      return NextResponse.json(
        {
          error: "TRANSACTION_NOT_DISPUTABLE",
          message: "El motivo de la disputa es obligatorio.",
        },
        { status: 400 }
      );
    }

    // Buscar transacción por orderId
    const transaction = await db.transaction.findUnique({
      where: { orderId },
      include: { dispute: true },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "TRANSACTION_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Solo se puede disputar si está en HELD o DELIVERED
    if (!["HELD", "DELIVERED"].includes(transaction.status)) {
      return NextResponse.json(
        {
          error: "TRANSACTION_NOT_DISPUTABLE",
          message: `No se puede disputar: estado actual es ${transaction.status}`,
        },
        { status: 400 }
      );
    }

    // No permitir disputas duplicadas
    if (transaction.dispute) {
      return NextResponse.json(
        {
          error: "TRANSACTION_NOT_DISPUTABLE",
          message: "Ya existe una disputa para esta transacción.",
        },
        { status: 400 }
      );
    }

    // Crear disputa y actualizar transacción
    await db.dispute.create({
      data: {
        transactionId: transaction.id,
        reason,
        description: description || null,
      },
    });

    await db.transaction.update({
      where: { id: transaction.id },
      data: { status: "DISPUTED" },
    });

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      newStatus: "DISPUTED",
      message:
        "Transacción en disputa. Los fondos han sido congelados hasta su resolución.",
    });
  } catch (error) {
    console.error("[dispute] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al abrir la disputa." },
      { status: 500 }
    );
  }
}
