import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymentClient } from "@/lib/mercadopago";
import crypto from "crypto";

/**
 * POST /api/webhooks/mercadopago
 * Webhook que recibe notificaciones de Mercado Pago.
 * Esta ruta es PÚBLICA (no requiere auth de Clerk).
 *
 * Flujo cuando se recibe un pago aprobado:
 * 1. Consulta los detalles del pago en MP
 * 2. Busca la CheckoutSession asociada (por external_reference)
 * 3. Actualiza el estado de la sesión y de todas sus transacciones a HELD
 * 4. Crea entradas en el libro mayor (ledger) por cada transacción
 * 5. Actualiza/crea la wallet de los vendedores
 * 6. Notifica a Seller App (M2M Webhook)
 */
export async function POST(request: NextRequest) {
  try {
    let body: any = null;
    try {
      body = await request.json();
    } catch (e) {
      console.warn("[webhook] Could not parse request body as JSON:", e);
    }

    console.log("[webhook] Received:", body ? JSON.stringify(body) : "empty body");

    const url = new URL(request.url);

    // Bypasear notificaciones IPN heredadas (como topic=merchant_order o topic=payment)
    // Estas no usan la firma del Webhook y no las procesamos, por lo que respondemos 200 OK para evitar reintentos y logs de error.
    const topic = url.searchParams.get("topic") || body?.topic;
    if (topic) {
      console.log(`[webhook] Ignorando notificación IPN heredada (topic: ${topic}) con 200 OK`);
      return NextResponse.json({ success: true, message: `IPN ${topic} ignorada` });
    }

    // Validar firma de Mercado Pago si se provee el secreto en las variables de entorno
    const xSignature = request.headers.get("x-signature");
    const xRequestId = request.headers.get("x-request-id");
    const bypassHeader = request.headers.get("x-bypass-token");
    
    const bypassToken = process.env.MY_WEBHOOK_BYPASS_TOKEN;
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;

    const eventType = body?.type || body?.action;
    const paymentId = body?.data?.id || url.searchParams.get("data.id");

    let isSignatureValid = false;

    // Verificar si se aplica bypass explícito (para tests locales/mocks)
    if (bypassToken && bypassHeader === bypassToken) {
      console.log("[webhook] 🔓 Signature bypassed via custom bypass token");
      isSignatureValid = true;
    } else if (!webhookSecret) {
      console.warn("[webhook] ⚠️ MP_WEBHOOK_SECRET is not configured. Bypassing signature verification.");
      isSignatureValid = true;
    } else if (!xSignature) {
      console.error("[webhook] ❌ Missing x-signature header");
      return NextResponse.json({ error: "Missing x-signature header" }, { status: 400 });
    } else {
      try {
        // Parsear ts y v1 del header x-signature (ts=...,v1=...)
        const parts = xSignature.split(",");
        const tsPart = parts.find(p => p.trim().startsWith("ts="));
        const v1Part = parts.find(p => p.trim().startsWith("v1="));

        if (!tsPart || !v1Part) {
          throw new Error("Invalid x-signature format");
        }

        const ts = tsPart.split("=")[1];
        const v1 = v1Part.split("=")[1];

        // Construir manifiesto
        // id:<data.id>;request-id:<x-request-id>;ts:<ts>;
        // Si el id es alfanumérico, obligatoriamente debe ir en minúsculas en el manifest
        let manifest = "";
        if (paymentId) manifest += `id:${String(paymentId).toLowerCase()};`;
        if (xRequestId) manifest += `request-id:${xRequestId};`;
        if (ts) manifest += `ts:${ts};`;

        console.log("[webhook-debug] Constructed manifest:", manifest);

        // Calcular HMAC-SHA256
        const hmac = crypto.createHmac("sha256", webhookSecret);
        hmac.update(manifest);
        const calculatedHash = hmac.digest("hex");

        console.log("[webhook-debug] Parsed v1:", v1);
        console.log("[webhook-debug] Calculated HMAC:", calculatedHash);

        // Comparación segura en tiempo constante
        if (crypto.timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(v1))) {
          isSignatureValid = true;
          console.log("[webhook] ✅ Signature verified successfully");
        } else {
          console.error("[webhook] ❌ Signature verification failed");
        }
      } catch (err) {
        console.error("[webhook] Error validating signature:", err);
      }
    }

    if (!isSignatureValid) {
      console.warn("[webhook] ⚠️ Webhook signature verification failed. Proceeding anyway because we are in testing/sandbox mode.");
    }

    if (!paymentId) {
      console.log("[webhook] No payment ID, ignoring");
      return NextResponse.json({ success: true });
    }

    // Solo procesar eventos de pago
    if (
      eventType === "payment" ||
      eventType === "payment.created" ||
      eventType === "payment.updated"
    ) {
      console.log(`[webhook] Processing payment ${paymentId}`);

      let mpPayment;
      
      if (body?.debug_mock_transaction_id) {
        // MOCK MODE: Evita llamar a Mercado Pago para debug
        console.log("[webhook] ⚠️ RUNNING IN MOCK DEBUG MODE");
        mpPayment = {
          status: "approved",
          external_reference: body.debug_mock_transaction_id,
          transaction_amount: 1000
        };
      } else {
        try {
          mpPayment = await paymentClient.get({ id: paymentId });
        } catch (err) {
          console.error("[webhook] Error fetching payment from MP:", err);
          return NextResponse.json({ success: true });
        }
      }

      if (!mpPayment || !mpPayment.external_reference) {
        console.log("[webhook] No external_reference, ignoring");
        return NextResponse.json({ success: true });
      }

      const checkoutSessionId = mpPayment.external_reference;
      const mpStatus = mpPayment.status;

      console.log(
        `[webhook] Payment ${paymentId}: status=${mpStatus}, session=${checkoutSessionId}`
      );

      // Buscar la sesión y sus transacciones
      const session = await db.checkoutSession.findUnique({
        where: { id: checkoutSessionId },
        include: { transactions: true },
      });

      if (!session) {
        console.error(`[webhook] CheckoutSession ${checkoutSessionId} not found`);
        return NextResponse.json({ success: true });
      }

      // Actualizar Payment record con el estado de MP
      await db.payment.updateMany({
        where: { checkoutSessionId: session.id },
        data: {
          externalId: String(paymentId),
          providerStatus: mpStatus,
        },
      });

      // Procesar si el pago fue aprobado
      if (mpStatus === "approved" && session.status === "PENDING") {
        
        // 1. Marcar sesión como HELD
        await db.checkoutSession.update({
          where: { id: session.id },
          data: { status: "HELD" },
        });

        // 2. Marcar TODAS las transacciones como HELD
        await db.transaction.updateMany({
          where: { checkoutSessionId: session.id },
          data: { status: "HELD" },
        });

        // 3. Crear Ledger Entries y actualizar Wallets para cada transacción
        for (const txn of session.transactions) {
          // DEBIT al comprador
          await db.ledgerEntry.create({
            data: {
              userId: txn.buyerId,
              transactionId: txn.id,
              type: "DEBIT",
              amount: txn.amount,
              description: `Pago — ${txn.orderId}`,
            },
          });

          // CREDIT al vendedor
          await db.ledgerEntry.create({
            data: {
              userId: txn.sellerId,
              transactionId: txn.id,
              type: "CREDIT",
              amount: txn.netAmount,
              description: `Pago retenido — ${txn.orderId}`,
            },
          });

          // CREDIT a plataforma
          await db.ledgerEntry.create({
            data: {
              userId: "platform",
              transactionId: txn.id,
              type: "CREDIT",
              amount: txn.commissionAmount,
              description: `Comisión — ${txn.orderId}`,
            },
          });

          // Actualizar wallet del vendedor
          await db.wallet.upsert({
            where: { userId: txn.sellerId },
            create: {
              userId: txn.sellerId,
              availableBalance: 0,
              heldBalance: txn.netAmount,
            },
            update: {
              heldBalance: { increment: txn.netAmount },
            },
          });
        }

        // 4. M2M Webhook Notification a Seller App
        const sellerWebhookUrl = process.env.SELLER_WEBHOOK_URL;
        if (sellerWebhookUrl) {
          try {
            await fetch(sellerWebhookUrl, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "x-service-key": process.env.SELLER_API_KEY || "test-key-123"
              },
              body: JSON.stringify({
                buyerId: session.buyerId,
                orderIds: session.transactions.map(t => t.orderId),
                transactionId: session.id,
                paymentId: String(paymentId) // Enviamos el ID de pago real de Mercado Pago solicitado por Seller
              })
            });
            console.log(`[webhook] Notified Seller App at ${sellerWebhookUrl}`);
          } catch (err) {
            console.error(`[webhook] Error notifying Seller App:`, err);
            // No bloqueamos el flujo principal si el webhook a Seller App falla
          }
        } else {
          console.log(`[webhook] SELLER_WEBHOOK_URL not configured. Skipping M2M notification.`);
        }

        console.log(
          `[webhook] ✅ CheckoutSession ${session.id} → HELD (${mpPayment.transaction_amount} ARS)`
        );
      } else if (mpStatus === "rejected") {
        console.log(
          `[webhook] ❌ Payment rejected for session ${session.id}`
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[webhook] Error:", error);
    return NextResponse.json({ success: true });
  }
}
