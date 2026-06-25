import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

export default async function AdminDashboardPage() {
  await requireRole(["payments_admin", "admin"]);

  // 1. Total transactions count (excluding pending drafts)
  const totalTransactions = await db.transaction.count({
    where: { status: { not: "PENDING" } },
  });

  // 2. Sum of transaction amounts (total volume of non-pending transactions)
  const volumeResult = await db.transaction.aggregate({
    where: { status: { not: "PENDING" } },
    _sum: { amount: true },
  });
  const totalVolume = Number(volumeResult._sum.amount || 0);

  // 3. Active disputes count (where resolvedAt is null)
  const activeDisputes = await db.dispute.count({
    where: { resolvedAt: null },
  });

  // 4. Sum of commission amounts (total commission generated from non-pending transactions)
  const commissionResult = await db.transaction.aggregate({
    where: { status: { not: "PENDING" } },
    _sum: { commissionAmount: true },
  });
  const totalCommission = Number(commissionResult._sum.commissionAmount || 0);

  // 5. Pending payments
  const pendingPayments = await db.transaction.count({
    where: { status: "PENDING" },
  });

  // 6. Completed today (completed transactions since midnight today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completedToday = await db.transaction.count({
    where: {
      status: "COMPLETED",
      updatedAt: { gte: today },
    },
  });

  // 7. Recent disputes
  const disputes = await db.dispute.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { transaction: true },
  });

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Editorial Header */}
      <div>
        <p className="text-label-md text-secondary mb-2">Vista general</p>
        <h1 className="text-display-sm text-on-surface">Admin Dashboard</h1>
        <p className="mt-2 text-body-md text-on-surface-muted">
          Vista general del sistema de pagos Bonzai
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: "Transacciones totales", value: totalTransactions.toString(), icon: "📊" },
          { title: "Volumen operado", value: formatCurrency(totalVolume), icon: "💰" },
          { title: "Disputas activas", value: activeDisputes.toString(), icon: "⚖️" },
          { title: "Comisiones generadas", value: formatCurrency(totalCommission), icon: "🏦" },
          { title: "Pagos pendientes", value: pendingPayments.toString(), icon: "⏳" },
          { title: "Completados hoy", value: completedToday.toString(), icon: "✅" },
        ].map((stat) => (
          <Card key={stat.title} hover>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-label-md text-on-surface-muted">{stat.title}</p>
                <span className="text-xl">{stat.icon}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-headline-lg text-on-surface">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Disputes */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-xl">⚖️</span>
            <h2 className="text-headline-md text-on-surface">Disputas recientes</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {disputes.map((dispute, i) => (
              <div
                key={dispute.id}
                className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg px-4 py-4 transition-colors duration-200 hover:bg-surface-low ${
                  i % 2 === 0 ? "bg-transparent" : "bg-surface-low/40"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-medium text-on-surface">
                    {dispute.transaction?.orderId || "Orden desconocida"}
                  </p>
                  <p className="text-label-sm text-on-surface-muted truncate">
                    {dispute.reason.replace(/_/g, " ")} · {dispute.id}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <p className="text-body-sm font-semibold text-on-surface">
                    {formatCurrency(Number(dispute.transaction?.amount || 0))}
                  </p>
                  <StatusBadge status={dispute.transaction?.status || "DISPUTED"} size="sm" />
                </div>
              </div>
            ))}
          </div>
          {disputes.length === 0 && (
            <p className="py-8 text-center text-body-sm text-on-surface-muted">
              No se encontraron disputas registradas en el sistema.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
