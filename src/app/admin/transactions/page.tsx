import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transacciones — Admin",
};

const mockTransactions = [
  { id: "txn_001", orderId: "ord_101", buyerId: "user_a", sellerId: "user_b", amount: 15000, status: "COMPLETED", createdAt: "2026-04-28T14:30:00Z" },
  { id: "txn_002", orderId: "ord_102", buyerId: "user_c", sellerId: "user_b", amount: 8500, status: "HELD", createdAt: "2026-04-28T12:15:00Z" },
  { id: "txn_003", orderId: "ord_103", buyerId: "user_a", sellerId: "user_d", amount: 22000, status: "DELIVERED", createdAt: "2026-04-27T18:45:00Z" },
  { id: "txn_004", orderId: "ord_104", buyerId: "user_e", sellerId: "user_b", amount: 5200, status: "DISPUTED", createdAt: "2026-04-27T10:20:00Z" },
  { id: "txn_005", orderId: "ord_105", buyerId: "user_c", sellerId: "user_d", amount: 31000, status: "PENDING", createdAt: "2026-04-26T16:00:00Z" },
  { id: "txn_006", orderId: "ord_106", buyerId: "user_a", sellerId: "user_d", amount: 12800, status: "REFUNDED", createdAt: "2026-04-25T09:10:00Z" },
  { id: "txn_007", orderId: "ord_107", buyerId: "user_f", sellerId: "user_b", amount: 7400, status: "COMPLETED", createdAt: "2026-04-24T11:30:00Z" },
  { id: "txn_008", orderId: "ord_108", buyerId: "user_a", sellerId: "user_g", amount: 19500, status: "HELD", createdAt: "2026-04-23T09:00:00Z" },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateStr));
}

export default function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Transacciones</h1>
        <p className="mt-1 text-muted-foreground">
          Gestión y auditoría de todas las transacciones del sistema
        </p>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por ID, orden, comprador o vendedor..."
                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select className="rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Todos los estados</option>
              <option value="PENDING">Pendiente</option>
              <option value="HELD">Retenido</option>
              <option value="DELIVERED">Entregado</option>
              <option value="DISPUTED">En disputa</option>
              <option value="COMPLETED">Completado</option>
              <option value="REFUNDED">Reembolsado</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Orden</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Comprador</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Vendedor</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Monto</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-muted/50 transition-colors">
                    <td className="py-3 text-sm font-mono text-muted-foreground">{txn.id}</td>
                    <td className="py-3 text-sm text-foreground">{txn.orderId}</td>
                    <td className="py-3 text-sm text-muted-foreground">{txn.buyerId}</td>
                    <td className="py-3 text-sm text-muted-foreground">{txn.sellerId}</td>
                    <td className="py-3 text-sm font-medium text-foreground">{formatCurrency(txn.amount)}</td>
                    <td className="py-3"><StatusBadge status={txn.status} size="sm" /></td>
                    <td className="py-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(txn.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Mostrando 1-{mockTransactions.length} de {mockTransactions.length}
            </p>
            <div className="flex gap-2">
              <button className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50" disabled>
                Anterior
              </button>
              <button className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50" disabled>
                Siguiente
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
