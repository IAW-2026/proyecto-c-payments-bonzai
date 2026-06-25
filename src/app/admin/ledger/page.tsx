import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import LedgerClient from "./LedgerClient";

export const dynamic = "force-dynamic";

export default async function AdminLedgerPage() {
  // Validate admin role
  await requireRole(["payments_admin", "admin"]);

  // Fetch all ledger entries from PostgreSQL via Prisma
  const data = await db.ledgerEntry.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Format decimal values and dates to serializable structures
  const entries = data.map((e) => ({
    id: e.id,
    userId: e.userId,
    transactionId: e.transactionId,
    type: e.type,
    amount: Number(e.amount),
    description: e.description || "",
    createdAt: e.createdAt.toISOString(),
  }));

  return <LedgerClient initialEntries={entries} />;
}
