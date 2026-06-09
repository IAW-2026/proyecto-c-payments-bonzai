import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import DashboardWalletClient from "./DashboardWalletClient";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const userId = await requireAuth();

  // Find or create wallet for current user
  const wallet = await db.wallet.upsert({
    where: { userId },
    create: {
      userId,
      availableBalance: 0,
      heldBalance: 0,
    },
    update: {},
  });

  // Fetch movements (ledger entries) for current user
  const data = await db.ledgerEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const walletData = {
    userId: wallet.userId,
    availableBalance: Number(wallet.availableBalance),
    heldBalance: Number(wallet.heldBalance),
    total: Number(wallet.availableBalance) + Number(wallet.heldBalance),
    currency: "ARS",
  };

  const movements = data.map((e) => ({
    id: e.id,
    type: e.type,
    amount: Number(e.amount),
    description: e.description || "",
    createdAt: e.createdAt.toISOString(),
  }));

  return <DashboardWalletClient initialWallet={walletData} initialMovements={movements} />;
}
