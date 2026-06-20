import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import TransactionsClient from "./TransactionsClient";

export const dynamic = "force-dynamic";

export default async function AdminTransactionsPage() {
  // Validate admin role
  await requireRole(["payments_admin", "admin"]);

  // Fetch all transactions from PostgreSQL via Prisma
  const data = await db.transaction.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Format decimal values and dates to serializable structures
  const transactions = data.map((t) => ({
    id: t.id,
    orderId: t.orderId,
    buyerId: t.buyerId,
    sellerId: t.sellerId,
    amount: Number(t.amount),
    status: t.status,
    createdAt: t.createdAt.toISOString(),
  }));

  return <TransactionsClient initialTransactions={transactions} />;
}
