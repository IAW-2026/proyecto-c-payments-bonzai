import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Libro Mayor</h1>
        <p className="mt-1 text-muted-foreground">
          Registro contable de todos los movimientos financieros
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Usuario</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Transacción</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Monto</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Descripción</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockLedgerEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/50 transition-colors">
                    <td className="py-3 text-sm font-mono text-muted-foreground">{entry.id}</td>
                    <td className="py-3 text-sm text-foreground">{entry.userId}</td>
                    <td className="py-3 text-sm font-mono text-muted-foreground">{entry.transactionId}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        entry.type === "CREDIT"
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-red-500/10 text-red-600 dark:text-red-400"
                      }`}>
                        {entry.type === "CREDIT" ? "CRÉDITO" : "DÉBITO"}
                      </span>
                    </td>
                    <td className={`py-3 text-sm font-medium ${
                      entry.type === "CREDIT"
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}>
                      {entry.type === "CREDIT" ? "+" : "-"}{formatCurrency(entry.amount)}
                    </td>
                    <td className="py-3 text-sm text-muted-foreground">{entry.description}</td>
                    <td className="py-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(entry.createdAt)}</td>
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
