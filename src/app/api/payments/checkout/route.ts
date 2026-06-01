import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { preferenceClient } from "@/lib/mercadopago";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Nueva estructura: recibe arreglo de "orders" en vez de un solo sellerId/amount
    const { orders, buyerEmail } = body;
    
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json(
        {
          error: "INVALID_ORDER",
          message: "Se requiere un arreglo de orders válido.",
        },
        { status: 400 }
      );
    }

    // Validar cada orden y sumar monto total
    let totalAmount = 0;
    for (const order of orders) {
      const { sellerId, amount, orderRef } = order;
      if (!sellerId || !amount || !orderRef) {
        return NextResponse.json({ error: "INVALID_ORDER", message: "Cada orden debe tener sellerId, amount y orderRef." }, { status: 400 });
      }
      if (typeof amount !== "number" || amount <= 0) {
        return NextResponse.json({ error: "INVALID_ORDER", message: "Los montos deben ser positivos." }, { status: 400 });
      }
      totalAmount += amount;
    }

    let buyerId = "anonymous";
    try {
      const { userId } = await auth();
      if (userId) buyerId = userId;
    } catch {
      buyerId = body.buyerId || "anonymous";
    }

    // Crear la CheckoutSession
    const checkoutSession = await db.checkoutSession.create({
      data: {
        buyerId,
        totalAmount,
        status: "PENDING",
      }
    });

    // Crear transacciones por cada orden
    const commissionRate = parseFloat(process.env.COMMISSION_RATE || "0.05");
    
    const transactionsData = orders.map((order: any) => {
      const commissionAmount = Math.round(order.amount * commissionRate * 100) / 100;
      const netAmount = Math.round((order.amount - commissionAmount) * 100) / 100;
      
      return {
        checkoutSessionId: checkoutSession.id,
        orderId: order.orderRef,
        buyerId,
        sellerId: order.sellerId,
        amount: order.amount,
        commissionRate,
        commissionAmount,
        netAmount,
        status: "PENDING" as const,
        currency: "ARS",
      };
    });

    await db.transaction.createMany({
      data: transactionsData,
    });

    // Crear la preferencia en Mercado Pago
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const itemsForMP = orders.map((order: any) => ({
      id: order.orderRef,
      title: order.description || `Orden ${order.orderRef} — Bonzai`,
      quantity: 1,
      unit_price: order.amount,
      currency_id: "ARS",
    }));

    const preference = await preferenceClient.create({
      body: {
        items: itemsForMP,
        payer: {
          email: buyerEmail || undefined,
        },
        external_reference: checkoutSession.id,
        back_urls: {
          // Nota: redirigimos a /checkout/status (implementaremos pronto)
          success: `${appUrl}/checkout/status?payment=success&session_id=${checkoutSession.id}`,
          failure: `${appUrl}/checkout/status?payment=failure&session_id=${checkoutSession.id}`,
          pending: `${appUrl}/checkout/status?payment=pending&session_id=${checkoutSession.id}`,
        },
        auto_return: appUrl.includes("localhost") ? undefined : "approved",
        notification_url: `${appUrl}/api/webhooks/mercadopago`,
      },
    });

    // Guardar Payment en la DB apuntando a la CheckoutSession
    await db.payment.create({
      data: {
        checkoutSessionId: checkoutSession.id,
        provider: "MERCADOPAGO",
        preferenceId: preference.id || null,
        checkoutUrl: preference.init_point || null,
        providerStatus: "pending",
      },
    });

    // Devolver la URL y el transactionId (que ahora es el ID de sesión) para compatibilidad con Seller
    return NextResponse.json(
      {
        transactionId: checkoutSession.id,
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
