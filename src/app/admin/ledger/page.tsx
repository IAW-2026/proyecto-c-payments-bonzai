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
        </CardContent>
      </Card>
    </div>
  );
}
