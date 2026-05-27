import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

const adminStats = {
  totalTransactions: 156,
  totalVolume: 2340000,
  activeDisputes: 3,
  totalCommission: 117000,
  pendingPayments: 12,
  completedToday: 8,
};

const recentDisputes = [
  { id: "txn_004", orderId: "ord_104", amount: 5200, reason: "ITEM_DAMAGED", createdAt: "2026-04-27T10:20:00Z" },
  { id: "txn_012", orderId: "ord_112", amount: 18700, reason: "ITEM_NOT_RECEIVED", createdAt: "2026-04-26T15:30:00Z" },
  { id: "txn_019", orderId: "ord_119", amount: 9300, reason: "WRONG_ITEM", createdAt: "2026-04-25T08:45:00Z" },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

export default function AdminDashboardPage() {
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
          { title: "Transacciones totales", value: adminStats.totalTransactions.toString(), icon: "📊" },
          { title: "Volumen operado", value: formatCurrency(adminStats.totalVolume), icon: "💰" },
          { title: "Disputas activas", value: adminStats.activeDisputes.toString(), icon: "⚖️" },
          { title: "Comisiones generadas", value: formatCurrency(adminStats.totalCommission), icon: "🏦" },
          { title: "Pagos pendientes", value: adminStats.pendingPayments.toString(), icon: "⏳" },
          { title: "Completados hoy", value: adminStats.completedToday.toString(), icon: "✅" },
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
                className={`flex items-center justify-between rounded-lg px-4 py-4 transition-colors duration-200 hover:bg-surface-low ${
                  i % 2 === 0 ? "bg-transparent" : "bg-surface-low/40"
                }`}
              >
                <div>
                  <p className="text-body-sm font-medium text-on-surface">
                    {dispute.orderId}
                  </p>
                  <p className="text-label-sm text-on-surface-muted">
                    {dispute.reason.replace(/_/g, " ")} · {dispute.id}
                  </p>
                </div>
                <div className="text-right flex items-center gap-4">
                  <p className="text-body-sm font-semibold text-on-surface">
                    {formatCurrency(dispute.amount)}
                  </p>
                  <StatusBadge status="DISPUTED" size="sm" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
