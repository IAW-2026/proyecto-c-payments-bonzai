import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";

// Datos mock para el dashboard (se reemplazan por queries reales cuando se configure la DB)
const mockStats = {
  totalTransactions: 24,
  totalVolume: 385000,
  heldBalance: 45000,
  availableBalance: 120000,
};

const mockRecentTransactions = [
  {
    id: "txn_001",
    orderId: "ord_101",
    amount: 15000,
    status: "COMPLETED",
    createdAt: "2026-04-28T14:30:00Z",
  },
  {
    id: "txn_002",
    orderId: "ord_102",
    amount: 8500,
    status: "HELD",
    createdAt: "2026-04-28T12:15:00Z",
  },
  {
    id: "txn_003",
    orderId: "ord_103",
    amount: 22000,
    status: "DELIVERED",
    createdAt: "2026-04-27T18:45:00Z",
  },
  {
    id: "txn_004",
    orderId: "ord_104",
    amount: 5200,
    status: "DISPUTED",
    createdAt: "2026-04-27T10:20:00Z",
  },
  {
    id: "txn_005",
    orderId: "ord_105",
    amount: 31000,
    status: "PENDING",
    createdAt: "2026-04-26T16:00:00Z",
  },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateStr));
}

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Resumen de tu actividad financiera en Bonzai
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Transacciones",
            value: mockStats.totalTransactions.toString(),
            icon: "📊",
            description: "Total procesadas",
          },
          {
            title: "Volumen total",
            value: formatCurrency(mockStats.totalVolume),
            icon: "💰",
            description: "Monto total operado",
          },
          {
            title: "Saldo retenido",
            value: formatCurrency(mockStats.heldBalance),
            icon: "🔒",
            description: "En período de protección",
          },
          {
            title: "Saldo disponible",
            value: formatCurrency(mockStats.availableBalance),
            icon: "✅",
            description: "Listo para retirar",
          },
        ].map((stat) => (
          <Card key={stat.title} hover>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <span className="text-xl">{stat.icon}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transacciones recientes</CardTitle>
            <Link
              href="/dashboard/transactions"
              className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors"
            >
              Ver todas →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    ID
                  </th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Orden
                  </th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockRecentTransactions.map((txn) => (
                  <tr
                    key={txn.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 text-sm font-mono text-muted-foreground">
                      {txn.id}
                    </td>
                    <td className="py-3 text-sm text-foreground">
                      {txn.orderId}
                    </td>
                    <td className="py-3 text-sm font-medium text-foreground">
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={txn.status} size="sm" />
                    </td>
                    <td className="py-3 text-sm text-muted-foreground">
                      {formatDate(txn.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
