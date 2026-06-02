import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

export default async function AdminDashboardPage() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalTxns,
    volumeAgg,
    commissionsAgg,
    activeDisputesCount,
    pendingCount,
    todayCompletedCount,
  ] = await Promise.all([
    db.transaction.count(),
    db.transaction.aggregate({ _sum: { amount: true } }),
    db.transaction.aggregate({ _sum: { commissionAmount: true } }),
    db.dispute.count({ where: { resolution: null } }),
    db.transaction.count({ where: { status: "PENDING" } }),
    db.transaction.count({
      where: {
        status: "COMPLETED",
        updatedAt: { gte: startOfToday },
      },
    }),
  ]);

  const recentDisputes = await db.dispute.findMany({
    where: { resolution: null },
    include: { transaction: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const totalVolume = Number(volumeAgg._sum.amount || 0);
  const totalCommission = Number(commissionsAgg._sum.commissionAmount || 0);

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
          { title: "Transacciones totales", value: totalTxns.toString(), icon: "📊" },
          { title: "Volumen operado", value: formatCurrency(totalVolume), icon: "💰" },
          { title: "Disputas activas", value: activeDisputesCount.toString(), icon: "⚖️" },
          { title: "Comisiones generadas", value: formatCurrency(totalCommission), icon: "🏦" },
          { title: "Pagos pendientes", value: pendingCount.toString(), icon: "⏳" },
          { title: "Completados hoy", value: todayCompletedCount.toString(), icon: "✅" },
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
            <h2 className="text-headline-md text-on-surface">Disputas activas</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recentDisputes.map((dispute, i) => (
              <div
                key={dispute.id}
                className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg px-4 py-4 transition-colors duration-200 hover:bg-surface-low ${
                  i % 2 === 0 ? "bg-transparent" : "bg-surface-low/40"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-medium text-on-surface">
                    {dispute.transaction.orderId}
                  </p>
                  <p className="text-label-sm text-on-surface-muted truncate">
                    {dispute.reason.replace(/_/g, " ")} · {dispute.id}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <p className="text-body-sm font-semibold text-on-surface">
                    {formatCurrency(Number(dispute.transaction.amount))}
                  </p>
                  <StatusBadge status="DISPUTED" size="sm" />
                </div>
              </div>
            ))}
            {recentDisputes.length === 0 && (
              <div className="py-8 text-center text-on-surface-muted">
                No hay disputas activas en este momento.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
