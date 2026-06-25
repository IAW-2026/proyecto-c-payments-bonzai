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

    // Ajustar wallets
    await db.wallet.update({
      where: { userId: transaction.sellerId },
      data: {
        heldBalance: { decrement: transaction.netAmount },
      },
    });

    await db.wallet.upsert({
      where: { userId: transaction.buyerId },
      create: {
        userId: transaction.buyerId,
        availableBalance: transaction.amount,
        heldBalance: 0,
      },
      update: {
        availableBalance: { increment: transaction.amount },
      },
    });

    // Registrar en libro mayor
    // 1. Crédito al comprador por el monto total reembolsado
    await db.ledgerEntry.create({
      data: {
        userId: transaction.buyerId,
        transactionId: transaction.id,
        type: "CREDIT",
        amount: transaction.amount,
        description: `Reembolso completo — ${transaction.orderId}`,
      },
    });

    // 2. Débito al vendedor por su monto neto original
    await db.ledgerEntry.create({
      data: {
        userId: transaction.sellerId,
        transactionId: transaction.id,
        type: "DEBIT",
        amount: transaction.netAmount,
        description: `Cargo por reembolso — ${transaction.orderId}`,
      },
    });

    // 3. Débito a la plataforma por la comisión reembolsada
    await db.ledgerEntry.create({
      data: {
        userId: "platform",
        transactionId: transaction.id,
        type: "DEBIT",
        amount: transaction.commissionAmount,
        description: `Reembolso de comisión — ${transaction.orderId}`,
      },
    });

    // Descontar la comisión reembolsada de la wallet de la plataforma
    await db.wallet.upsert({
      where: { userId: "platform" },
      create: {
        userId: "platform",
        availableBalance: -transaction.commissionAmount,
        heldBalance: 0,
      },
      update: {
        availableBalance: { decrement: transaction.commissionAmount },
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
