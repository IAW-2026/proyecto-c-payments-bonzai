import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import AdminAnalyticsClient from "./AdminAnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  // Validate admin authorization
  await requireRole(["payments_admin", "admin"]);

  // Fetch all transactions, disputes, and wallets
  const transactionsData = await db.transaction.findMany({
    orderBy: { createdAt: "asc" },
  });

  const disputesData = await db.dispute.findMany({
    include: {
      transaction: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const walletsData = await db.wallet.findMany();

  // Map Decimal values and Dates to numbers and strings for serialization
  const transactions = transactionsData.map((t) => ({
    id: t.id,
    orderId: t.orderId,
    buyerId: t.buyerId,
    sellerId: t.sellerId,
    amount: Number(t.amount),
    commissionAmount: Number(t.commissionAmount),
    netAmount: Number(t.netAmount),
    status: t.status,
    createdAt: t.createdAt.toISOString(),
  }));

  const disputes = disputesData.map((d) => ({
    id: d.id,
    transactionId: d.transactionId,
    reason: d.reason,
    resolution: d.resolution,
    resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
    createdAt: d.createdAt.toISOString(),
    amount: d.transaction ? Number(d.transaction.amount) : 0,
    status: d.transaction ? d.transaction.status : "DISPUTED",
  }));

  const wallets = walletsData.map((w) => ({
    id: w.id,
    userId: w.userId,
    availableBalance: Number(w.availableBalance),
    heldBalance: Number(w.heldBalance),
  }));

  return (
    <AdminAnalyticsClient
      transactions={transactions}
      disputes={disputes}
      wallets={wallets}
    />
  );
}
