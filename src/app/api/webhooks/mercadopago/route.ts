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

    // --- 1. BYPASS TOKEN VALIDATION ---
    const bypassToken = process.env.MY_WEBHOOK_BYPASS_TOKEN;
    const requestBypassToken = 
      request.headers.get("x-bypass-token") ||
      request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ||
      url.searchParams.get("bypass_token") ||
      url.searchParams.get("secret") ||
      body?.bypass_token ||
      body?.secret;

    const isBypassAuthorized = !!bypassToken && requestBypassToken === bypassToken;

    if (isBypassAuthorized) {
      console.log("[webhook] 🔓 Request authorized via bypass token (Simulation mode)");
    } else {
      // --- 2. MERCADO PAGO SIGNATURE VALIDATION ---
      const webhookSecret = process.env.MP_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error("[webhook] ❌ MP_WEBHOOK_SECRET is not configured in environment variables!");
        return NextResponse.json(
          { success: false, error: "Webhook signature secret is not configured" },
          { status: 500 }
        );
      }

      const xSignature = request.headers.get("x-signature");
      const xRequestId = request.headers.get("x-request-id");
      
      let dataId = url.searchParams.get("data.id") || url.searchParams.get("id");
      if (!dataId && body) {
        dataId = body.data?.id || body.id;
      }

      if (!xSignature || !xRequestId || !dataId) {
        console.warn(
          `[webhook] ❌ Missing verification requirements. Signature: ${!!xSignature}, RequestId: ${!!xRequestId}, DataId: ${!!dataId}`
        );
        return NextResponse.json(
          { success: false, error: "Unauthorized: Missing signature components" },
          { status: 401 }
        );
      }

      // Parse x-signature (format: ts=TIMESTAMP,v1=SIGNATURE)
      const parts = xSignature.split(",");
      let ts = "";
      let v1 = "";
      for (const part of parts) {
        const [key, value] = part.trim().split("=");
        if (key === "ts") ts = value;
        if (key === "v1") v1 = value;
      }

      if (!ts || !v1) {
        console.warn("[webhook] ❌ Invalid x-signature header format");
        return NextResponse.json(
          { success: false, error: "Unauthorized: Invalid signature format" },
          { status: 401 }
        );
      }

      // Generate expected signature
      const dataIdStr = String(dataId).toLowerCase();
      const manifest = `id:${dataIdStr};request-id:${xRequestId};ts:${ts};`;
      
      // Intentar calcular la firma con la clave en formato string directo
      const hmacRaw = crypto.createHmac("sha256", webhookSecret);
      hmacRaw.update(manifest);
      const calculatedSignatureRaw = hmacRaw.digest("hex");

      // Intentar calcular la firma interpretando la clave hex como un Buffer binario (común en claves de 256 bits)
      let calculatedSignatureHex = "";
      try {
        if (webhookSecret.length === 64) {
          const hmacHex = crypto.createHmac("sha256", Buffer.from(webhookSecret, "hex"));
          hmacHex.update(manifest);
          calculatedSignatureHex = hmacHex.digest("hex");
        }
      } catch (err) {
        console.warn("[webhook-debug] Error al convertir secret a hex buffer:", err);
      }

      console.log("[webhook-debug] Secret length:", webhookSecret.length);
      console.log("[webhook-debug] Secret start:", webhookSecret.slice(0, 3), "... end:", webhookSecret.slice(-3));
      console.log("[webhook-debug] x-signature:", xSignature);
      console.log("[webhook-debug] x-request-id:", xRequestId);
      console.log("[webhook-debug] dataIdStr:", dataIdStr);
      console.log("[webhook-debug] Parsed ts:", ts, "v1:", v1);
      console.log("[webhook-debug] Constructed manifest:", manifest);
      console.log("[webhook-debug] Calculated (Raw Key):", calculatedSignatureRaw);
      console.log("[webhook-debug] Calculated (Hex Key):", calculatedSignatureHex);

      // Secure constant-time comparison
      const secureCompare = (a: string, b: string) => {
        if (!a || !b) return false;
        const bufA = Buffer.from(a);
        const bufB = Buffer.from(b);
        if (bufA.length !== bufB.length) return false;
        return crypto.timingSafeEqual(bufA, bufB);
      };

      const isSignatureValid = 
        secureCompare(calculatedSignatureRaw, v1) || 
        (!!calculatedSignatureHex && secureCompare(calculatedSignatureHex, v1));

      if (!isSignatureValid) {
        console.warn(`[webhook] ❌ Signature verification failed! Expected (v1): ${v1}`);
        return NextResponse.json(
          { success: false, error: "Unauthorized: Invalid signature" },
          { status: 401 }
        );
      }

      console.log("[webhook] 🔒 Request signature verified successfully (Mercado Pago)");
    }

    const eventType = body?.type || body?.action;
    const paymentId = body?.data?.id;

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
                transactionId: session.id
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
