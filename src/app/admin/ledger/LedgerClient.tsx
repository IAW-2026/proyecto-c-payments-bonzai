"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination, paginateArray } from "@/components/ui/pagination";
import { ExportButton } from "@/components/ui/export-button";

const PAGE_SIZE = 20;

interface LedgerEntry {
  id: string;
  userId: string;
  transactionId: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  description: string;
  createdAt: string;
}

interface LedgerClientProps {
  initialEntries: LedgerEntry[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateStr));
}

export default function LedgerClient({ initialEntries }: LedgerClientProps) {
  const [page, setPage] = useState(1);
  const { data: entries, totalPages } = paginateArray(initialEntries, page, PAGE_SIZE);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Editorial Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label-md text-secondary mb-2">Contabilidad</p>
          <h1 className="text-display-sm text-on-surface">Libro Mayor</h1>
          <p className="mt-2 text-body-md text-on-surface-muted">
            Registro contable de todos los movimientos financieros
          </p>
        </div>
        <ExportButton entity="ledger" hasData={initialEntries.length > 0} />
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
                {entries.map((entry, i) => (
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

          {initialEntries.length === 0 && (
            <p className="py-8 text-center text-body-sm text-on-surface-muted">
              No se encontraron entradas en el libro mayor.
            </p>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={initialEntries.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            className="mt-6"
          />
        </CardContent>
      </Card>
    </div>
  );
}
