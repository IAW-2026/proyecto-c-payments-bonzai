import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

/**
 * GET /api/payments/balance
 * Consulta el saldo de la billetera de un usuario.
 * Consumido por: Seller App, Admin
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener userId del token de Clerk
    let userId: string | null = null;
    try {
      const { userId: clerkUserId } = await auth();
      userId = clerkUserId;
    } catch {
      // Si no hay auth, intentar con query param (para Seller App)
      userId = request.nextUrl.searchParams.get("userId");
    }

    if (!userId) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "userId requerido." },
        { status: 401 }
      );
    }

    // Buscar o crear wallet
    const wallet = await db.wallet.upsert({
      where: { userId },
      create: {
        userId,
        availableBalance: 0,
        heldBalance: 0,
      },
      update: {},
    });

    return NextResponse.json({
      userId: wallet.userId,
      balances: {
        available: Number(wallet.availableBalance),
        held: Number(wallet.heldBalance),
        total:
          Number(wallet.availableBalance) + Number(wallet.heldBalance),
      },
      currency: "ARS",
      updatedAt: wallet.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[balance] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al consultar saldo." },
      { status: 500 }
    );
  }
}
