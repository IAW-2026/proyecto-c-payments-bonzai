import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Libro Mayor — Admin",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

function formatDate(dateStr: Date | string): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateStr));
}

export default async function AdminLedgerPage() {
  const ledgerEntries = await db.ledgerEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 100, // Límite temporal hasta implementar paginación
  });

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
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
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
                {ledgerEntries.map((entry, i) => (
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
                      {entry.type === "CREDIT" ? "+" : "-"}{formatCurrency(Number(entry.amount))}
                    </td>
                    <td className="py-4 text-body-sm text-on-surface-muted">{entry.description || "-"}</td>
                    <td className="py-4 text-body-sm text-on-surface-muted whitespace-nowrap">{formatDate(entry.createdAt)}</td>
                  </tr>
                ))}
                {ledgerEntries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-on-surface-muted">
                      No hay registros en el libro mayor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden flex flex-col gap-4">
            {ledgerEntries.map((entry) => (
              <div key={entry.id} className="border border-surface-high rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-widest mb-2 ${
                      entry.type === "CREDIT"
                        ? "bg-success-container text-success"
                        : "bg-error-container text-error"
                    }`}>
                      {entry.type === "CREDIT" ? "CRÉDITO" : "DÉBITO"}
                    </span>
                    <p className="text-body-sm text-on-surface break-all font-medium">User: {entry.userId}</p>
                  </div>
                  <p className={`text-headline-sm font-bold ${
                    entry.type === "CREDIT" ? "text-success" : "text-error"
                  }`}>
                    {entry.type === "CREDIT" ? "+" : "-"}{formatCurrency(Number(entry.amount))}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-label-sm text-on-surface-muted">
                    Tx: <span className="font-mono">{entry.transactionId}</span>
                  </p>
                  <p className="text-label-sm text-on-surface-muted">
                    ID: <span className="font-mono">{entry.id}</span>
                  </p>
                </div>
                
                <div className="flex justify-between items-end border-t border-surface-high pt-2 mt-1">
                  <p className="text-body-sm text-on-surface-variant flex-1 pr-2">
                    {entry.description || "-"}
                  </p>
                  <p className="text-label-sm text-on-surface-muted whitespace-nowrap text-right">
                    {formatDate(entry.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            {ledgerEntries.length === 0 && (
              <div className="py-8 text-center text-on-surface-muted border-2 border-dashed border-surface-high rounded-xl">
                No hay registros en el libro mayor.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
