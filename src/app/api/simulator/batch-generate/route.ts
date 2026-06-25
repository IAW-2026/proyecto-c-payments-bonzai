import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { getRoles } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const roles = await getRoles();
    if (!roles.includes("payments_admin") && !roles.includes("admin") && !roles.includes("super_admin")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json();
    const {
      buyerIds,
      sellerIds,
      startDate,
      endDate,
      iterations = 10,
      minAmount = 15000,
      maxAmount = 48000,
      paymentProbability = 0.85,
      deliveryProbability = 0.40,
      disputeProbability = 0.10,
    } = body;

    if (!buyerIds || !Array.isArray(buyerIds) || buyerIds.length === 0) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "Se requieren buyerIds válidos." }, { status: 400 });
    }
    if (!sellerIds || !Array.isArray(sellerIds) || sellerIds.length === 0) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "Se requieren sellerIds válidos." }, { status: 400 });
    }
    if (!startDate || !endDate) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "Se requieren startDate y endDate." }, { status: 400 });
    }

    const startTs = new Date(startDate).getTime();
    const endTs = new Date(endDate).getTime();
    if (isNaN(startTs) || isNaN(endTs) || startTs > endTs) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "Rango de fechas inválido." }, { status: 400 });
    }

    const commissionRate = parseFloat(process.env.COMMISSION_RATE || "0.05");
    const disputeWindowDays = parseInt(process.env.DISPUTE_WINDOW_DAYS || "7");

    // Keep track of wallet balance updates in memory
    // userId -> { available: number, held: number }
    const walletChanges = new Map<string, { available: number; held: number }>();
    const adjustWallet = (uid: string, availableDiff: number, heldDiff: number) => {
      if (!walletChanges.has(uid)) {
        walletChanges.set(uid, { available: 0, held: 0 });
      }
      const current = walletChanges.get(uid)!;
      current.available += availableDiff;
      current.held += heldDiff;
    };

    const disputeReasons = [
      "ITEM_NOT_RECEIVED",
      "ITEM_DAMAGED",
      "ITEM_NOT_AS_DESCRIBED",
      "WRONG_ITEM",
      "QUALITY_ISSUE",
      "OTHER"
    ];

    const generateUUID = () => {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };

    let generatedCount = 0;
    const now = new Date();

    // Run simulator iterations
    for (let i = 0; i < iterations; i++) {
      // 1. Pick random date/time within the selected date range
      const randomTs = startTs + Math.random() * (endTs - startTs);
      const checkoutDate = new Date(randomTs);

      // 2. Select buyer
      const buyerId = buyerIds[Math.floor(Math.random() * buyerIds.length)];

      // 3. Select 1 to 3 sellers (distinct, and not the buyer if possible)
      const possibleSellers = sellerIds.filter(id => id !== buyerId);
      const sellersToUse = possibleSellers.length > 0 ? possibleSellers : sellerIds;
      
      const numSellers = Math.min(Math.floor(Math.random() * 3) + 1, sellersToUse.length);
      const selectedSellers: string[] = [];
      const tempSellers = [...sellersToUse];
      for (let s = 0; s < numSellers; s++) {
        const idx = Math.floor(Math.random() * tempSellers.length);
        selectedSellers.push(tempSellers.splice(idx, 1)[0]);
      }

      // 4. Create orders details
      const orders = selectedSellers.map((sellerId) => {
        const amount = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
        const commissionAmount = Math.round(amount * commissionRate * 100) / 100;
        const netAmount = Math.round((amount - commissionAmount) * 100) / 100;
        return {
          sellerId,
          amount,
          commissionAmount,
          netAmount,
          orderRef: generateUUID(),
        };
      });

      const totalAmount = orders.reduce((sum, o) => sum + o.amount, 0);

      // We determine probabilities
      const isPaid = Math.random() < paymentProbability;

      let sessionStatus = "PENDING";
      let txStatus = "PENDING";
      if (isPaid) {
        sessionStatus = "HELD";
        txStatus = "HELD";
      }

      // Create CheckoutSession
      const checkoutSession = await db.checkoutSession.create({
        data: {
          buyerId,
          totalAmount,
          status: sessionStatus as any,
          createdAt: checkoutDate,
          updatedAt: checkoutDate,
        }
      });

      // Create Payment record
      const paymentId = "sim_pay_" + Math.floor(Math.random() * 10000000);
      await db.payment.create({
        data: {
          checkoutSessionId: checkoutSession.id,
          provider: "MERCADOPAGO",
          providerStatus: isPaid ? "approved" : "pending",
          externalId: isPaid ? paymentId : null,
          idempotencyKey: generateUUID(),
          checkoutUrl: `https://sandbox.mercadopago.com.ar/checkout/preference?pref_id=pref_${Math.random().toString(36).substring(2, 9)}`,
          preferenceId: `pref_${Math.random().toString(36).substring(2, 9)}`,
          createdAt: checkoutDate,
        }
      });

      // Create Transactions and handling subsequent flows
      for (const order of orders) {
        // Create Transaction
        const transaction = await db.transaction.create({
          data: {
            checkoutSessionId: checkoutSession.id,
            orderId: order.orderRef,
            buyerId,
            sellerId: order.sellerId,
            amount: order.amount,
            commissionRate,
            commissionAmount: order.commissionAmount,
            netAmount: order.netAmount,
            status: txStatus as any,
            currency: "ARS",
            createdAt: checkoutDate,
            updatedAt: checkoutDate,
          }
        });

        if (isPaid) {
          // Ledger entries for payment
          await db.ledgerEntry.createMany({
            data: [
              {
                userId: buyerId,
                transactionId: transaction.id,
                type: "DEBIT",
                amount: order.amount,
                description: `Pago — ${order.orderRef}`,
                createdAt: checkoutDate,
              },
              {
                userId: order.sellerId,
                transactionId: transaction.id,
                type: "CREDIT",
                amount: order.netAmount,
                description: `Pago retenido — ${order.orderRef}`,
                createdAt: checkoutDate,
              },
              {
                userId: "platform",
                transactionId: transaction.id,
                type: "CREDIT",
                amount: order.commissionAmount,
                description: `Comisión — ${order.orderRef}`,
                createdAt: checkoutDate,
              }
            ]
          });

          // Adjust wallet in memory (escrow HELD for seller, available for platform)
          adjustWallet("platform", order.commissionAmount, 0);
          adjustWallet(order.sellerId, 0, order.netAmount);

          // Delivery and Dispute Simulation
          let finalTxStatus = "HELD";
          let finalTxDate = checkoutDate;

          // 1. Delivery check
          const isDelivered = Math.random() < deliveryProbability;
          if (isDelivered) {
            const deliveryDelayMs = (Math.floor(Math.random() * 3) + 1) * 24 * 60 * 60 * 1000;
            const deliveryDate = new Date(Math.min(checkoutDate.getTime() + deliveryDelayMs, now.getTime()));
            
            finalTxStatus = "DELIVERED";
            finalTxDate = deliveryDate;

            // Escrow Release (Auto-completion): is it older than 7 days?
            const daysSinceDelivery = (now.getTime() - deliveryDate.getTime()) / (24 * 60 * 60 * 1000);
            const isCompleted = daysSinceDelivery > disputeWindowDays;

            if (isCompleted) {
              finalTxStatus = "COMPLETED";
              const releaseDelayMs = disputeWindowDays * 24 * 60 * 60 * 1000;
              finalTxDate = new Date(Math.min(deliveryDate.getTime() + releaseDelayMs, now.getTime()));
              
              // Move seller funds from held to available
              adjustWallet(order.sellerId, order.netAmount, -order.netAmount);
            }
          }

          // Write initial delivery/completed state (if changed from HELD)
          if (finalTxStatus !== "HELD") {
            await db.transaction.update({
              where: { id: transaction.id },
              data: {
                status: finalTxStatus as any,
                updatedAt: finalTxDate,
              }
            });

            await db.checkoutSession.update({
              where: { id: checkoutSession.id },
              data: {
                status: finalTxStatus as any,
                updatedAt: finalTxDate,
              }
            });
          }

          // 2. Dispute Simulation (ONLY if the transaction is still in HELD or DELIVERED, i.e., NOT completed)
          const isDisputable = finalTxStatus === "HELD" || finalTxStatus === "DELIVERED";
          const isDisputed = isDisputable && Math.random() < disputeProbability;
          
          if (isDisputed) {
            const disputeDelayMs = Math.random() * 2 * 24 * 60 * 60 * 1000;
            const disputeDate = new Date(Math.min(finalTxDate.getTime() + disputeDelayMs, now.getTime()));

            // Update transaction to DISPUTED status
            await db.transaction.update({
              where: { id: transaction.id },
              data: {
                status: "DISPUTED",
                updatedAt: disputeDate,
              }
            });

            // Create Dispute record
            const disputeReason = disputeReasons[Math.floor(Math.random() * disputeReasons.length)];
            const dispute = await db.dispute.create({
              data: {
                transactionId: transaction.id,
                reason: disputeReason as any,
                description: `Disputa simulada de la orden ${order.orderRef}`,
                createdAt: disputeDate,
              }
            });

            // Decide dispute resolution (50% probability resolved in the past)
            const isResolved = Math.random() < 0.50;
            if (isResolved) {
              const resolutionDelayMs = (Math.floor(Math.random() * 3) + 1) * 24 * 60 * 60 * 1000;
              const resolutionDate = new Date(Math.min(disputeDate.getTime() + resolutionDelayMs, now.getTime()));
              const resolution = Math.random() < 0.50 ? "FAVOR_BUYER" : "FAVOR_SELLER";

              await db.dispute.update({
                where: { id: dispute.id },
                data: {
                  resolution: resolution as any,
                  resolvedAt: resolutionDate,
                  resolutionNotes: `Resolución simulada por el sistema: ${resolution}`,
                  refundAmount: resolution === "FAVOR_BUYER" ? order.amount : null,
                }
              });

              if (resolution === "FAVOR_SELLER") {
                // Resolve as COMPLETED
                await db.transaction.update({
                  where: { id: transaction.id },
                  data: {
                    status: "COMPLETED",
                    updatedAt: resolutionDate,
                  }
                });

                // Since it resolved FAVOR_SELLER, seller funds move from HELD (from initial payment) to AVAILABLE
                adjustWallet(order.sellerId, order.netAmount, -order.netAmount);
              } else {
                // Resolve as REFUNDED
                await db.transaction.update({
                  where: { id: transaction.id },
                  data: {
                    status: "REFUNDED",
                    updatedAt: resolutionDate,
                  }
                });

                // FAVOR_BUYER refund:
                // Decrement from seller's HELD balance (where it was placed during payment)
                adjustWallet(order.sellerId, 0, -order.netAmount);
                // Credit buyer
                adjustWallet(buyerId, order.amount, 0);
                // Debit platform commission
                adjustWallet("platform", -order.commissionAmount, 0);

                // Create refund ledger entries
                await db.ledgerEntry.createMany({
                  data: [
                    {
                      userId: buyerId,
                      transactionId: transaction.id,
                      type: "CREDIT",
                      amount: order.amount,
                      description: `Reembolso (FAVOR_BUYER) — ${order.orderRef}`,
                      createdAt: resolutionDate,
                    },
                    {
                      userId: order.sellerId,
                      transactionId: transaction.id,
                      type: "DEBIT",
                      amount: order.netAmount,
                      description: `Cargo por reembolso (FAVOR_BUYER) — ${order.orderRef}`,
                      createdAt: resolutionDate,
                    },
                    {
                      userId: "platform",
                      transactionId: transaction.id,
                      type: "DEBIT",
                      amount: order.commissionAmount,
                      description: `Reembolso de comisión (FAVOR_BUYER) — ${order.orderRef}`,
                      createdAt: resolutionDate,
                    }
                  ]
                });
              }
            }
          }
        }
      }
      generatedCount++;
    }

    // Now write aggregated wallet balance updates to database
    for (const [uid, change] of walletChanges.entries()) {
      await db.wallet.upsert({
        where: { userId: uid },
        create: {
          userId: uid,
          availableBalance: change.available,
          heldBalance: change.held,
        },
        update: {
          availableBalance: { increment: change.available },
          heldBalance: { increment: change.held },
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Simulación completada con éxito. Se generaron ${generatedCount} sesiones de checkout.`,
      sessionsCreated: generatedCount,
    });
  } catch (error: any) {
    console.error("[batch-generate] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message || "Error al generar transacciones en lote." },
      { status: 500 }
    );
  }
}
