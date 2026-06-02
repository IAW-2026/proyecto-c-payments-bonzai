import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
}

function formatDate(dateStr: Date | string): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateStr));
}

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Obtener la billetera del usuario
  let wallet = await db.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    wallet = await db.wallet.create({
      data: {
        userId,
        availableBalance: 0,
        heldBalance: 0,
      },
    });
  }

  // Obtener transacciones recientes donde el usuario es comprador o vendedor
  const recentTransactions = await db.transaction.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Estadísticas globales del usuario
  const stats = await db.transaction.aggregate({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    _count: {
      id: true,
    },
    _sum: {
      amount: true,
    },
  });

  const totalTransactions = stats._count.id;
  const totalVolume = stats._sum.amount ? Number(stats._sum.amount) : 0;

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
            value: formatCurrency(Number(wallet.heldBalance)),
            icon: "🔒",
            description: "En período de protección",
          },
          {
            title: "Saldo disponible",
            value: formatCurrency(Number(wallet.availableBalance)),
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

          {/* Mobile Cards */}
          <div className="md:hidden flex flex-col gap-4 mt-4">
            {recentTransactions.map((txn) => (
              <div key={txn.id} className="border border-surface-high rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-body-md font-semibold text-on-surface">
                      {txn.orderId}
                    </p>
                    <p className="text-label-sm text-on-surface-muted font-mono mt-0.5">
                      {txn.id}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-headline-sm font-bold text-on-surface">
                      {formatCurrency(Number(txn.amount))}
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-end border-t border-surface-high pt-3 mt-1">
                  <StatusBadge status={txn.status} size="sm" />
                  <p className="text-label-sm text-on-surface-muted">
                    {formatDate(txn.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <div className="py-8 text-center text-on-surface-muted border-2 border-dashed border-surface-high rounded-xl mt-4">
                No tienes transacciones recientes.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
