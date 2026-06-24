import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/payments/[id]/resolve-dispute
 * Resuelve una disputa (solo admin).
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
    const body = await request.json();
    const { resolution, resolutionNotes } = body;

    if (
      !resolution ||
      !["FAVOR_BUYER", "FAVOR_SELLER"].includes(resolution)
    ) {
      return NextResponse.json(
        {
          error: "INVALID_RESOLUTION_DATA",
          message:
            "La resolución debe ser FAVOR_BUYER o FAVOR_SELLER.",
        },
        { status: 422 }
      );
    }

    // Buscar transacción
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

    if (transaction.status !== "DISPUTED" || !transaction.dispute) {
      return NextResponse.json(
        {
          error: "INVALID_RESOLUTION_DATA",
          message: "Esta transacción no tiene una disputa abierta.",
        },
        { status: 400 }
      );
    }

    // Resolver disputa
    const actualRefundAmount =
      resolution === "FAVOR_BUYER"
        ? Number(transaction.amount)
        : 0;

    await db.dispute.update({
      where: { id: transaction.dispute.id },
      data: {
        resolution,
        resolutionNotes: resolutionNotes || null,
        refundAmount: actualRefundAmount > 0 ? actualRefundAmount : null,
        resolvedAt: new Date(),
      },
    });

    // Actualizar transacción
    const newStatus =
      resolution === "FAVOR_SELLER" ? "COMPLETED" : "REFUNDED";
    await db.transaction.update({
      where: { id: transaction.id },
      data: { status: newStatus },
    });

    // Ajustar wallets
    if (resolution === "FAVOR_SELLER") {
      // Mover de held a available para el vendedor
      await db.wallet.update({
        where: { userId: transaction.sellerId },
        data: {
          heldBalance: { decrement: transaction.netAmount },
          availableBalance: { increment: transaction.netAmount },
        },
      });
    } else {
      // Reembolso total: quitar de held del vendedor
      await db.wallet.update({
        where: { userId: transaction.sellerId },
        data: {
          heldBalance: { decrement: transaction.netAmount },
        },
      });

      // Y acreditar en la billetera del comprador (disponible)
      await db.wallet.upsert({
        where: { userId: transaction.buyerId },
        create: {
          userId: transaction.buyerId,
          availableBalance: actualRefundAmount,
          heldBalance: 0,
        },
        update: {
          availableBalance: { increment: actualRefundAmount },
        },
      });
    }

    // Registrar en el libro mayor
    if (actualRefundAmount > 0) {
      // 1. Crédito al comprador por el monto total reembolsado
      await db.ledgerEntry.create({
        data: {
          userId: transaction.buyerId,
          transactionId: transaction.id,
          type: "CREDIT",
          amount: actualRefundAmount,
          description: `Reembolso (${resolution}) — ${transaction.orderId}`,
        },
      });

      // 2. Débito al vendedor por su monto neto original
      await db.ledgerEntry.create({
        data: {
          userId: transaction.sellerId,
          transactionId: transaction.id,
          type: "DEBIT",
          amount: transaction.netAmount,
          description: `Cargo por reembolso (${resolution}) — ${transaction.orderId}`,
        },
      });

      // 3. Débito a la plataforma por la comisión reembolsada
      await db.ledgerEntry.create({
        data: {
          userId: "platform",
          transactionId: transaction.id,
          type: "DEBIT",
          amount: transaction.commissionAmount,
          description: `Reembolso de comisión (${resolution}) — ${transaction.orderId}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      newStatus,
      refundAmount: actualRefundAmount > 0 ? actualRefundAmount : undefined,
      message: "Disputa resuelta.",
    });
  } catch (error) {
    console.error("[resolve-dispute] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al resolver la disputa." },
      { status: 500 }
    );
  }
}
