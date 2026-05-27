import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Libro Mayor — Admin",
};

const mockLedgerEntries = [
  { id: "le_001", userId: "user_b", transactionId: "txn_001", type: "CREDIT" as const, amount: 14250, description: "Pago liberado — ord_101", createdAt: "2026-04-28T14:30:00Z" },
  { id: "le_002", userId: "platform", transactionId: "txn_001", type: "CREDIT" as const, amount: 750, description: "Comisión — ord_101", createdAt: "2026-04-28T14:30:00Z" },
  { id: "le_003", userId: "user_a", transactionId: "txn_001", type: "DEBIT" as const, amount: 15000, description: "Pago — ord_101", createdAt: "2026-04-28T14:30:00Z" },
  { id: "le_004", userId: "user_b", transactionId: "txn_002", type: "CREDIT" as const, amount: 8075, description: "Pago retenido — ord_102", createdAt: "2026-04-28T12:15:00Z" },
  { id: "le_005", userId: "platform", transactionId: "txn_002", type: "CREDIT" as const, amount: 425, description: "Comisión — ord_102", createdAt: "2026-04-28T12:15:00Z" },
  { id: "le_006", userId: "user_c", transactionId: "txn_002", type: "DEBIT" as const, amount: 8500, description: "Pago — ord_102", createdAt: "2026-04-28T12:15:00Z" },
  { id: "le_007", userId: "user_a", transactionId: "txn_006", type: "CREDIT" as const, amount: 12800, description: "Reembolso — ord_106", createdAt: "2026-04-25T09:10:00Z" },
  { id: "le_008", userId: "user_d", transactionId: "txn_006", type: "DEBIT" as const, amount: 12160, description: "Cargo por reembolso — ord_106", createdAt: "2026-04-25T09:10:00Z" },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateStr));
}

export default function AdminLedgerPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Editorial Header */}
      <div>
        <p className="text-label-md text-secondary mb-2">Contabilidad</p>
        <h1 className="text-display-sm text-on-surface">Libro Mayor</h1>
        <p className="mt-2 text-body-md text-on-surface-muted">
          Registro contable de todos los movimientos financieros
        </p>
      </div>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">ID</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Usuario</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Transacción</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Tipo</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Monto</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Descripción</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {mockLedgerEntries.map((entry, i) => (
                  <tr
                    key={entry.id}
                    className={`transition-colors duration-200 hover:bg-surface-low ${
                      i % 2 === 0 ? "bg-transparent" : "bg-surface-low/50"
                    }`}
                  >
                    <td className="py-4 text-body-sm font-mono text-on-surface-muted">{entry.id}</td>
                    <td className="py-4 text-body-sm text-on-surface">{entry.userId}</td>
                    <td className="py-4 text-body-sm font-mono text-on-surface-muted">{entry.transactionId}</td>
                    <td className="py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-widest ${
                        entry.type === "CREDIT"
                          ? "bg-success-container text-success"
                          : "bg-error-container text-error"
                      }`}>
                        {entry.type === "CREDIT" ? "CRÉDITO" : "DÉBITO"}
                      </span>
                    </td>
                    <td className={`py-4 text-body-sm font-medium ${
                      entry.type === "CREDIT"
                        ? "text-success"
                        : "text-error"
                    }`}>
                      {entry.type === "CREDIT" ? "+" : "-"}{formatCurrency(entry.amount)}
                    </td>
                    <td className="py-4 text-body-sm text-on-surface-muted">{entry.description}</td>
                    <td className="py-4 text-body-sm text-on-surface-muted whitespace-nowrap">{formatDate(entry.createdAt)}</td>
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
