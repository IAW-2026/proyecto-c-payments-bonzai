import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { TransactionFilters } from "@/components/admin/TransactionFilters";
import { TransactionStatus } from "@/generated/prisma/client";

export const metadata: Metadata = {
  title: "Transacciones",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

function formatDate(dateStr: Date | string): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateStr));
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { status, q } = await searchParams;

  // Construir consulta dinámica basada en los filtros
  const whereClause: any = {
    OR: [{ buyerId: userId }, { sellerId: userId }],
  };
  
  if (status) {
    whereClause.status = status as TransactionStatus;
  }
  
  if (q) {
    whereClause.AND = [
      {
        OR: [
          { id: { contains: q, mode: "insensitive" } },
          { orderId: { contains: q, mode: "insensitive" } },
        ]
      }
    ];
  }

  const transactions = await db.transaction.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  });

  // In the future, use searchParams for filtering and pagination
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Editorial Header */}
      <div>
        <p className="text-label-md text-secondary mb-2">Historial</p>
        <h1 className="text-display-sm text-on-surface">Transacciones</h1>
        <p className="mt-2 text-body-md text-on-surface-muted">
          Historial completo de todas tus transacciones
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <TransactionFilters basePath="/dashboard/transactions" />
        </CardContent>
      </Card>

      {/* Transactions Table & Cards */}
      <Card>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Transacción</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Orden</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Monto</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Comisión</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Neto</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Estado</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn, i) => (
                  <tr
                    key={txn.id}
                    className={`transition-colors duration-200 hover:bg-surface-low ${
                      i % 2 === 0 ? "bg-transparent" : "bg-surface-low/50"
                    }`}
                  >
                    <td className="py-4 text-body-sm font-mono text-on-surface-muted">{txn.id}</td>
                    <td className="py-4 text-body-sm text-on-surface">{txn.orderId}</td>
                    <td className="py-4 text-body-sm font-medium text-on-surface">{formatCurrency(Number(txn.amount))}</td>
                    <td className="py-4 text-body-sm text-on-surface-muted">{formatCurrency(Number(txn.commissionAmount))}</td>
                    <td className="py-4 text-body-sm font-medium text-primary">{formatCurrency(Number(txn.netAmount))}</td>
                    <td className="py-4"><StatusBadge status={txn.status} size="sm" /></td>
                    <td className="py-4 text-body-sm text-on-surface-muted whitespace-nowrap">{formatDate(txn.createdAt)}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-on-surface-muted">
                      No tienes transacciones registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden flex flex-col gap-4">
            {transactions.map((txn) => (
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
                
                <div className="grid grid-cols-2 gap-2 text-body-sm mt-1">
                  <div>
                    <p className="text-label-sm text-on-surface-muted mb-0.5">Comisión</p>
                    <p className="text-on-surface-variant">{formatCurrency(Number(txn.commissionAmount))}</p>
                  </div>
                  <div>
                    <p className="text-label-sm text-on-surface-muted mb-0.5">Neto a recibir/pagar</p>
                    <p className="font-semibold text-primary">{formatCurrency(Number(txn.netAmount))}</p>
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
            {transactions.length === 0 && (
              <div className="py-8 text-center text-on-surface-muted border-2 border-dashed border-surface-high rounded-xl">
                No tienes transacciones registradas.
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between pt-4">
            <p className="text-body-sm text-on-surface-muted">
              Mostrando {transactions.length > 0 ? 1 : 0}-{transactions.length} de {transactions.length} transacciones
            </p>
            <div className="flex gap-2">
              <button className="rounded bg-surface-mid px-4 py-2 text-body-sm text-on-surface-muted transition-colors duration-200 hover:text-on-surface hover:bg-surface-high disabled:opacity-50" disabled>
                Anterior
              </button>
              <button className="rounded bg-surface-mid px-4 py-2 text-body-sm text-on-surface-muted transition-colors duration-200 hover:text-on-surface hover:bg-surface-high disabled:opacity-50" disabled>
                Siguiente
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
