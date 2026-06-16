import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateM2MAuth } from "@/lib/m2m-auth";
import { toNumber } from "@/lib/query-helpers";

/**
 * POST /api/control-plane/wallets/[userId]/adjust
 * Ajuste manual de saldo en la wallet de un vendedor.
 * Permite acreditar/debitar fondos directamente (multas, compensaciones, etc.)
 * y genera la correspondiente entrada inmutable en el Libro Mayor.
 *
 * Consumido por: Control Plane
 *
 * Body:
 *   - type: "CREDIT" | "DEBIT"
 *   - amount: monto positivo a acreditar/debitar
 *   - reason: motivo del ajuste (obligatorio, para auditoría)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authError = validateM2MAuth(request, "control-plane");
  if (authError) return authError;

  try {
    const { userId } = await params;
    const body = await request.json();
    const { type, amount, reason } = body;

    // Validaciones
    if (!type || !["CREDIT", "DEBIT"].includes(type)) {
      return NextResponse.json(
        {
          error: "INVALID_TYPE",
          message: "El tipo debe ser CREDIT o DEBIT.",
        },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        {
          error: "INVALID_AMOUNT",
          message: "El monto debe ser un número positivo.",
        },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        {
          error: "MISSING_REASON",
          message: "El motivo del ajuste es obligatorio para auditoría.",
        },
        { status: 400 }
      );
    }

    // Verificar que existe la wallet
    const wallet = await db.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: "WALLET_NOT_FOUND", message: "Wallet no encontrada para este usuario." },
        { status: 404 }
      );
    }

    // Validar que hay saldo suficiente para débitos
    if (type === "DEBIT" && toNumber(wallet.availableBalance) < amount) {
      return NextResponse.json(
        {
          error: "INSUFFICIENT_BALANCE",
          message: `Saldo disponible insuficiente. Disponible: ${toNumber(wallet.availableBalance)}, Solicitado: ${amount}`,
        },
        { status: 400 }
      );
    }

    // Realizar ajuste en una transacción de base de datos atómica
    const walletResult = await db.$transaction(async (tx) => {
      // 1. Asegurar que existe la sesión y transacción de ajustes del sistema (para mantener la integridad del ledger)
      await tx.checkoutSession.upsert({
        where: { id: "system-adjustments-session" },
        create: {
          id: "system-adjustments-session",
          buyerId: "system",
          totalAmount: 0,
          status: "COMPLETED",
        },
        update: {},
      });

      await tx.transaction.upsert({
        where: { id: "system-adjustments-txn" },
        create: {
          id: "system-adjustments-txn",
          checkoutSessionId: "system-adjustments-session",
          orderId: "system-adjustments-order",
          buyerId: "system",
          sellerId: "system",
          amount: 0,
          commissionAmount: 0,
          netAmount: 0,
          status: "COMPLETED",
        },
        update: {},
      });

      // 2. Ajustar wallet
      const w = await tx.wallet.update({
        where: { userId },
        data: {
          availableBalance:
            type === "CREDIT"
              ? { increment: amount }
              : { decrement: amount },
        },
      });

      // 3. Crear Ledger Entry para el usuario
      await tx.ledgerEntry.create({
        data: {
          userId,
          transactionId: "system-adjustments-txn",
          type,
          amount,
          description: `[AJUSTE MANUAL] ${
            type === "CREDIT" ? "Acreditación" : "Débito"
          } — ${reason}`,
        },
      });

      // 4. Crear Ledger Entry contra-asiento para la plataforma para mantener Σ(DEBIT) = Σ(CREDIT)
      await tx.ledgerEntry.create({
        data: {
          userId: "platform",
          transactionId: "system-adjustments-txn",
          type: type === "CREDIT" ? "DEBIT" : "CREDIT",
          amount,
          description: `[AJUSTE MANUAL CONTRA-ASIENTO] Contra-partida de ajuste para seller ${userId} — ${reason}`,
        },
      });

      return w;
    });

    return NextResponse.json({
      success: true,
      userId,
      adjustment: {
        type,
        amount,
        reason,
      },
      wallet: {
        availableBalance: toNumber(walletResult.availableBalance),
        heldBalance: toNumber(walletResult.heldBalance),
        totalBalance:
          toNumber(walletResult.availableBalance) +
          toNumber(walletResult.heldBalance),
      },
      message: `${type === "CREDIT" ? "Acreditación" : "Débito"} de $${amount} procesado.`,
    });
  } catch (error) {
    console.error("[control-plane/wallets/[userId]/adjust] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al ajustar saldo." },
      { status: 500 }
    );
  }
}
