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
    <div className="space-y-8 animate-fade-in">
      {/* Editorial Header */}
      <div>
        <p className="text-label-md text-secondary mb-2">Auditoría</p>
        <h1 className="text-display-sm text-on-surface">Transacciones</h1>
        <p className="mt-2 text-body-md text-on-surface-muted">
          Gestión y auditoría de todas las transacciones del sistema
        </p>
      </div>

      {/* Search & Filters — minimalist */}
      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por ID, orden, comprador o vendedor..."
                className="w-full border-0 border-b-2 border-surface-high bg-transparent px-1 py-3 text-body-sm text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:outline-none transition-colors duration-300"
              />
            </div>
            <select className="border-0 border-b-2 border-surface-high bg-transparent px-1 py-3 text-body-sm text-on-surface focus:border-primary focus:outline-none transition-colors duration-300">
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
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">ID</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Orden</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Comprador</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Vendedor</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Monto</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Estado</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {mockTransactions.map((txn, i) => (
                  <tr
                    key={txn.id}
                    className={`transition-colors duration-200 hover:bg-surface-low ${
                      i % 2 === 0 ? "bg-transparent" : "bg-surface-low/50"
                    }`}
                  >
                    <td className="py-4 text-body-sm font-mono text-on-surface-muted">{txn.id}</td>
                    <td className="py-4 text-body-sm text-on-surface">{txn.orderId}</td>
                    <td className="py-4 text-body-sm text-on-surface-muted">{txn.buyerId}</td>
                    <td className="py-4 text-body-sm text-on-surface-muted">{txn.sellerId}</td>
                    <td className="py-4 text-body-sm font-medium text-on-surface">{formatCurrency(txn.amount)}</td>
                    <td className="py-4"><StatusBadge status={txn.status} size="sm" /></td>
                    <td className="py-4 text-body-sm text-on-surface-muted whitespace-nowrap">{formatDate(txn.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between pt-4">
            <p className="text-body-sm text-on-surface-muted">
              Mostrando 1-{mockTransactions.length} de {mockTransactions.length}
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
