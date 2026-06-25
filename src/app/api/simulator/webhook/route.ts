import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { getRoles } from "@/lib/auth";

/**
 * GET /api/simulator/webhook
 * Fetch database state for simulated users (transactions, wallets, ledger entries, and sessions).
 * If no userIds are provided, it returns recent global data.
 */
export async function GET(request: NextRequest) {
  try {
    // Standard auth check (only logged-in users can use this)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const roles = await getRoles();
    if (!roles.includes("payments_admin") && !roles.includes("admin") && !roles.includes("super_admin")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userIdsParam = searchParams.get("userIds");
    
    let userIds: string[] = [];
    if (userIdsParam) {
      userIds = userIdsParam.split(",").map(id => id.trim()).filter(id => id.length > 0);
    }

    // 1. Fetch Wallets
    const wallets = await db.wallet.findMany({
      where: userIds.length > 0 ? { userId: { in: userIds } } : undefined,
      orderBy: { updatedAt: "desc" },
    });

    // 2. Fetch Transactions
    const transactions = await db.transaction.findMany({
      where: userIds.length > 0 ? {
        OR: [
          { buyerId: { in: userIds } },
          { sellerId: { in: userIds } }
        ]
      } : undefined,
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    // Get checkout session IDs from transactions
    const sessionIds = Array.from(new Set(transactions.map(t => t.checkoutSessionId)));

    // 3. Fetch Checkout Sessions (direct fetch including payments relation to get the checkoutUrl)
    const checkoutSessions = await db.checkoutSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        payments: true,
      },
    });

    // 4. Fetch Ledger Entries
    // Always include 'platform' ledger entries to see commissions
    const ledgerUserIds = [...userIds, "platform"];
    const ledgerEntries = await db.ledgerEntry.findMany({
      where: userIds.length > 0 ? { userId: { in: ledgerUserIds } } : undefined,
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      wallets,
      transactions,
      checkoutSessions,
      ledgerEntries,
    });
  } catch (error: any) {
    console.error("[simulator-state] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/simulator/webhook
 * Triggers the Mercado Pago webhook endpoint with the proper bypass headers.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const roles = await getRoles();
    if (!roles.includes("payments_admin") && !roles.includes("admin") && !roles.includes("super_admin")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json();
    const { checkoutSessionId, status, amount } = body;

    if (!checkoutSessionId) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Se requiere checkoutSessionId." },
        { status: 400 }
      );
    }

    // Look up the checkout session to make sure it exists
    const session = await db.checkoutSession.findUnique({
      where: { id: checkoutSessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `CheckoutSession ${checkoutSessionId} no encontrada.` },
        { status: 404 }
      );
    }

    const bypassToken = process.env.MY_WEBHOOK_BYPASS_TOKEN || "my_custom_secret_bypass_999";
    const requestUrl = new URL(request.url);
    const webhookUrl = `${requestUrl.protocol}//${requestUrl.host}/api/webhooks/mercadopago`;

    const mockPaymentId = `sim_pay_${Math.floor(Math.random() * 10000000)}`;

    console.log(`[simulator-webhook] Forwarding mock webhook to: ${webhookUrl} for session ${checkoutSessionId}`);

    const webhookBody = {
      type: "payment",
      action: "payment.updated",
      data: {
        id: mockPaymentId,
      },
      debug_mock_transaction_id: checkoutSessionId,
      debug_mock_status: status || "approved",
      debug_mock_amount: amount ? Number(amount) : Number(session.totalAmount),
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bypass-token": bypassToken,
      },
      body: JSON.stringify(webhookBody),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { text: responseText };
    }

    console.log(`[simulator-webhook] Webhook response code: ${response.status}`);

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      payloadSent: webhookBody,
      responseReceived: responseData,
    });
  } catch (error: any) {
    console.error("[simulator-webhook] Error processing mock payment:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message },
      { status: 500 }
    );
  }
}
