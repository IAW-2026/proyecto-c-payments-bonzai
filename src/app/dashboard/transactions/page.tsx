import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import DashboardTransactionsClient from "./DashboardTransactionsClient";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const userId = await requireAuth();

  const data = await db.transaction.findMany({
    where: {
      OR: [
        { buyerId: userId },
        { sellerId: userId },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  // Convert prisma decimal/dates to serializable structures
  const transactions = data.map((t) => ({
    id: t.id,
    orderId: t.orderId,
    buyerId: t.buyerId,
    sellerId: t.sellerId,
    amount: Number(t.amount),
    commissionAmount: Number(t.commissionAmount),
    netAmount: Number(t.netAmount),
    status: t.status,
    currency: t.currency,
    createdAt: t.createdAt.toISOString(),
  }));

  return <DashboardTransactionsClient initialTransactions={transactions} />;
}
