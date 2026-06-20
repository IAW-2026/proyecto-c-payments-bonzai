import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function UserAnalyticsPage() {
  // Validate authentication
  const userId = await requireAuth();

  // Fetch all transactions involving this user
  const transactionsData = await db.transaction.findMany({
    where: {
      OR: [
        { buyerId: userId },
        { sellerId: userId },
      ],
    },
    orderBy: { createdAt: "asc" }, // Ascending so we can build chrono lines
  });

  // Map to serializable structure
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

  return <AnalyticsClient userId={userId} initialTransactions={transactions} />;
}
