import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
    <div className="space-y-10 animate-fade-in">
      {/* Editorial Header */}
      <div>
        <p className="text-label-md text-secondary mb-2">Panel de usuario</p>
        <h1 className="text-display-sm text-on-surface">Dashboard</h1>
        <p className="mt-2 text-body-md text-on-surface-muted">
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
                <p className="text-label-md text-on-surface-muted">
                  {stat.title}
                </p>
                <span className="text-xl">{stat.icon}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-headline-lg text-on-surface">{stat.value}</p>
              <p className="mt-1 text-body-sm text-on-surface-muted">
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
            <h2 className="text-headline-md text-on-surface">Transacciones recientes</h2>
            <Link
              href="/dashboard/transactions"
              className="text-body-sm text-secondary font-medium transition-colors duration-300 hover:text-primary"
            >
              Ver todas →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">
                    ID
                  </th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">
                    Orden
                  </th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">
                    Monto
                  </th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">
                    Estado
                  </th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockRecentTransactions.map((txn, i) => (
                  <tr
                    key={txn.id}
                    className={`transition-colors duration-200 hover:bg-surface-low ${
                      i % 2 === 0 ? "bg-transparent" : "bg-surface-low/50"
                    }`}
                  >
                    <td className="py-4 text-body-sm font-mono text-on-surface-muted">
                      {txn.id}
                    </td>
                    <td className="py-4 text-body-sm text-on-surface">
                      {txn.orderId}
                    </td>
                    <td className="py-4 text-body-sm font-medium text-on-surface">
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="py-4">
                      <StatusBadge status={txn.status} size="sm" />
                    </td>
                    <td className="py-4 text-body-sm text-on-surface-muted">
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
