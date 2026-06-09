import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function DashboardPage() {
  const userId = await requireAuth();

  // 1. Billetera (Saldo disponible y retenido)
  const wallet = await db.wallet.upsert({
    where: { userId },
    create: {
      userId,
      availableBalance: 0,
      heldBalance: 0,
    },
    update: {},
  });

  const available = Number(wallet.availableBalance);
  const held = Number(wallet.heldBalance);

  // 2. Cantidad de transacciones del usuario (como comprador o vendedor)
  const totalTransactions = await db.transaction.count({
    where: {
      OR: [
        { buyerId: userId },
        { sellerId: userId },
      ],
    },
  });

  // 3. Volumen total operado (suma de transacciones completadas)
  const volumeResult = await db.transaction.aggregate({
    where: {
      OR: [
        { buyerId: userId },
        { sellerId: userId },
      ],
      status: "COMPLETED",
    },
    _sum: {
      amount: true,
    },
  });
  const totalVolume = Number(volumeResult._sum.amount || 0);

  // 4. Transacciones recientes
  const recentTransactions = await db.transaction.findMany({
    where: {
      OR: [
        { buyerId: userId },
        { sellerId: userId },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

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
            value: totalTransactions.toString(),
            icon: "📊",
            description: "Total procesadas",
          },
          {
            title: "Volumen total",
            value: formatCurrency(totalVolume),
            icon: "💰",
            description: "Monto total operado",
          },
          {
            title: "Saldo retenido",
            value: formatCurrency(held),
            icon: "🔒",
            description: "En período de protección",
          },
          {
            title: "Saldo disponible",
            value: formatCurrency(available),
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
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
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
                {recentTransactions.map((txn, i) => (
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
                      {formatCurrency(Number(txn.amount))}
                    </td>
                    <td className="py-4">
                      <StatusBadge status={txn.status} size="sm" />
                    </td>
                    <td className="py-4 text-body-sm text-on-surface-muted">
                      {formatDate(txn.createdAt)}
                    </td>
                  </tr>
                ))}
                {recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-on-surface-muted">
                      No tienes transacciones recientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {recentTransactions.length === 0 && (
            <p className="py-8 text-center text-body-sm text-on-surface-muted">
              No tienes transacciones registradas aún.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
