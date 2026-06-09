import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import DisputesClient from "./DisputesClient";

export const dynamic = "force-dynamic";

export default async function AdminDisputesPage() {
  // Validate admin role
  await requireRole(["payments_admin", "admin"]);

  // Fetch all disputes from PostgreSQL via Prisma
  const data = await db.dispute.findMany({
    include: { transaction: true },
    orderBy: { createdAt: "desc" },
  });

  // Format decimal values and dates to serializable structures
  const disputes = data.map((d) => ({
    id: d.id,
    transactionId: d.transactionId,
    orderId: d.transaction?.orderId || "",
    buyerId: d.transaction?.buyerId || "",
    sellerId: d.transaction?.sellerId || "",
    amount: Number(d.transaction?.amount || 0),
    reason: d.reason,
    description: d.description || "",
    status: d.transaction?.status || "DISPUTED",
    createdAt: d.createdAt.toISOString(),
    resolution: d.resolution,
    resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
  }));

  return <DisputesClient initialDisputes={disputes} />;
}
