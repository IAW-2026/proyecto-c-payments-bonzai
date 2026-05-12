import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymentClient } from "@/lib/mercadopago";
import { confirmPaymentToSeller } from "@/lib/mocks/seller-api";

/**
 * POST /api/webhooks/mercadopago
 * Webhook que recibe notificaciones de Mercado Pago.
 * Esta ruta es PÚBLICA (no requiere auth de Clerk).
 *
 * Flujo cuando se recibe un pago aprobado:
 * 1. Consulta los detalles del pago en MP
 * 2. Busca la transacción asociada (por external_reference)
 * 3. Actualiza el estado de la transacción a HELD
 * 4. Crea entradas en el libro mayor (ledger)
 * 5. Actualiza/crea la wallet del vendedor
 * 6. Notifica a Seller App
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("[webhook] Received:", JSON.stringify(body));

    // Mercado Pago envía distintos formatos de notificación
    // IPN: { type: "payment", data: { id: "123" } }
    // Webhook v2: { action: "payment.created", data: { id: "123" } }
    const eventType = body.type || body.action;
    const paymentId = body.data?.id;

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

      // 1. Consultar detalles del pago en Mercado Pago
      let mpPayment;
      try {
        mpPayment = await paymentClient.get({ id: paymentId });
      } catch (err) {
        console.error("[webhook] Error fetching payment from MP:", err);
        return NextResponse.json({ success: true });
      }

      if (!mpPayment || !mpPayment.external_reference) {
        console.log("[webhook] No external_reference, ignoring");
        return NextResponse.json({ success: true });
      }

      const transactionId = mpPayment.external_reference;
      const mpStatus = mpPayment.status; // approved, rejected, pending, etc.

      console.log(
        `[webhook] Payment ${paymentId}: status=${mpStatus}, txn=${transactionId}`
      );

      // 2. Buscar transacción en la DB
      const transaction = await db.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        console.error(`[webhook] Transaction ${transactionId} not found`);
        return NextResponse.json({ success: true });
      }

      // 3. Actualizar Payment record con el estado de MP
      await db.payment.updateMany({
        where: { transactionId: transaction.id },
        data: {
          externalId: String(paymentId),
          providerStatus: mpStatus,
        },
      });

      // 4. Procesar según estado del pago
      if (mpStatus === "approved" && transaction.status === "PENDING") {
        // Pago aprobado → cambiar transacción a HELD
        await db.transaction.update({
          where: { id: transaction.id },
          data: { status: "HELD" },
        });

        // 5. Crear entradas en el libro mayor
        // DEBIT al comprador (pagó)
        await db.ledgerEntry.create({
          data: {
            userId: transaction.buyerId,
            transactionId: transaction.id,
            type: "DEBIT",
            amount: transaction.amount,
            description: `Pago — ${transaction.orderId}`,
          },
        });

        // CREDIT al vendedor (neto, retenido)
        await db.ledgerEntry.create({
          data: {
            userId: transaction.sellerId,
            transactionId: transaction.id,
            type: "CREDIT",
            amount: transaction.netAmount,
            description: `Pago retenido — ${transaction.orderId}`,
          },
        });

        // CREDIT a la plataforma (comisión)
        await db.ledgerEntry.create({
          data: {
            userId: "platform",
            transactionId: transaction.id,
            type: "CREDIT",
            amount: transaction.commissionAmount,
            description: `Comisión — ${transaction.orderId}`,
          },
        });

        // 6. Actualizar/crear wallet del vendedor
        await db.wallet.upsert({
          where: { userId: transaction.sellerId },
          create: {
            userId: transaction.sellerId,
            availableBalance: 0,
            heldBalance: transaction.netAmount,
          },
          update: {
            heldBalance: {
              increment: transaction.netAmount,
            },
          },
        });

        // 7. Notificar a Seller App (mock en Etapa 2)
        await confirmPaymentToSeller(
          transaction.orderId,
          transaction.id,
          new Date().toISOString()
        );

        console.log(
          `[webhook] ✅ Transaction ${transaction.id} → HELD (${mpPayment.transaction_amount} ARS)`
        );
      } else if (mpStatus === "rejected") {
        console.log(
          `[webhook] ❌ Payment rejected for txn ${transaction.id}`
        );
        // Podríamos marcar la transacción como fallida, pero
        // dejamos en PENDING por si el comprador reintenta
      }
    }

    // Mercado Pago espera un 200 OK
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[webhook] Error:", error);
    // Siempre devolver 200 para evitar reintentos de MP
    return NextResponse.json({ success: true });
  }
}
