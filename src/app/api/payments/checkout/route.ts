import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { preferenceClient } from "@/lib/mercadopago";
import { auth } from "@clerk/nextjs/server";

/**
 * POST /api/payments/checkout
 * Inicia un proceso de pago para una orden.
 * Consumido por: Buyer App
 *
 * Flujo:
 * 1. Valida los datos de entrada
 * 2. Crea una Transaction en la DB (estado PENDING)
 * 3. Crea una Preference en Mercado Pago (Checkout Pro)
 * 4. Guarda el Payment en la DB con la preferenceId y checkoutUrl
 * 5. Devuelve la URL de checkout al cliente
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar campos requeridos
    const { sellerId, amount, orderRef, description, buyerEmail } = body;
    if (!sellerId || !amount || !orderRef) {
      return NextResponse.json(
        {
          error: "INVALID_ORDER",
          message: "sellerId, amount y orderRef son obligatorios.",
        },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        {
          error: "INVALID_ORDER",
          message: "El monto debe ser un número positivo.",
        },
        { status: 400 }
      );
    }

    // Obtener buyerId del token de Clerk (si está autenticado)
    let buyerId = "anonymous";
    try {
      const { userId } = await auth();
      if (userId) buyerId = userId;
    } catch {
      // Si no hay auth, usar el buyerId que mande el caller
      buyerId = body.buyerId || "anonymous";
    }

    // Verificar que no exista ya una transacción para esta orden
    const existing = await db.transaction.findUnique({
      where: { orderId: orderRef },
    });
    if (existing) {
      // Si ya existe y tiene checkoutUrl, devolver esa
      const existingPayment = await db.payment.findFirst({
        where: { transactionId: existing.id },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(
        {
          transactionId: existing.id,
          checkoutUrl: existingPayment?.checkoutUrl || null,
          status: existing.status,
          message: "Ya existe una transacción para esta orden.",
        },
        { status: 200 }
      );
    }

    // Calcular comisión
    const commissionRate = parseFloat(process.env.COMMISSION_RATE || "0.05");
    const commissionAmount = Math.round(amount * commissionRate * 100) / 100;
    const netAmount = Math.round((amount - commissionAmount) * 100) / 100;

    // 1. Crear transacción en la DB
    const transaction = await db.transaction.create({
      data: {
        orderId: orderRef,
        buyerId,
        sellerId,
        amount,
        commissionRate,
        commissionAmount,
        netAmount,
        status: "PENDING",
        currency: "ARS",
      },
    });

    // 2. Crear preferencia de Mercado Pago (Checkout Pro)
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: transaction.id,
            title: description || `Orden ${orderRef} — Bonzai`,
            quantity: 1,
            unit_price: amount,
            currency_id: "ARS",
          },
        ],
        payer: {
          email: buyerEmail || undefined,
        },
        // external_reference vincula el pago con nuestra transacción
        external_reference: transaction.id,
        // URLs de retorno después del pago
        back_urls: {
          success: `${appUrl}/dashboard?payment=success&txn=${transaction.id}`,
          failure: `${appUrl}/dashboard?payment=failure&txn=${transaction.id}`,
          pending: `${appUrl}/dashboard?payment=pending&txn=${transaction.id}`,
        },
        auto_return: appUrl.includes("localhost") ? undefined : "approved",
        // URL del webhook (MP la llama cuando cambia el estado del pago)
        notification_url: `${appUrl}/api/webhooks/mercadopago`,
      },
    });

    // 3. Guardar el Payment en la DB
    await db.payment.create({
      data: {
        transactionId: transaction.id,
        provider: "MERCADOPAGO",
        preferenceId: preference.id || null,
        checkoutUrl: preference.init_point || null,
        providerStatus: "pending",
      },
    });

    // 4. Devolver la URL de checkout
    return NextResponse.json(
      {
        transactionId: transaction.id,
        checkoutUrl: preference.init_point,
        sandboxUrl: preference.sandbox_init_point,
        status: "PENDING",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[checkout] Error:", error);
    return NextResponse.json(
      {
        error: "PAYMENT_FAILED",
        message:
          error instanceof Error ? error.message : "Error al procesar el pago.",
        details: JSON.stringify(error, Object.getOwnPropertyNames(error))
      },
      { status: 500 }
    );
  }
}
