import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import WalletsClient from "./WalletsClient";

export const dynamic = "force-dynamic";

export default async function AdminWalletsPage() {
  // Validate admin role
  await requireRole(["payments_admin", "admin"]);

  // Fetch all wallets from PostgreSQL via Prisma
  const data = await db.wallet.findMany({
    orderBy: { updatedAt: "desc" },
  });

  // Format decimal values and dates to serializable structures
  const wallets = data.map((w) => ({
    id: w.id,
    userId: w.userId,
    availableBalance: Number(w.availableBalance),
    heldBalance: Number(w.heldBalance),
    updatedAt: w.updatedAt.toISOString(),
  }));

  return <WalletsClient initialWallets={wallets} />;
}
