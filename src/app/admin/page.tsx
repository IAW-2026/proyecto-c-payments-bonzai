import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
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
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <span className="text-xl">{stat.icon}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Disputes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⚖️ Disputas activas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentDisputes.map((dispute) => (
              <div
                key={dispute.id}
                className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {dispute.orderId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dispute.reason.replace(/_/g, " ")} • {dispute.id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
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
