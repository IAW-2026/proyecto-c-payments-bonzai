"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination, paginateArray } from "@/components/ui/pagination";
import { ExportButton } from "@/components/ui/export-button";

const PAGE_SIZE = 20;

interface Wallet {
  id: string;
  userId: string;
  availableBalance: number;
  heldBalance: number;
  updatedAt: string;
}

interface WalletsClientProps {
  initialWallets: Wallet[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateStr));
}

export default function WalletsClient({ initialWallets }: WalletsClientProps) {
  const [page, setPage] = useState(1);
  const { data: wallets, totalPages } = paginateArray(initialWallets, page, PAGE_SIZE);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Editorial Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label-md text-secondary mb-2">Usuarios</p>
          <h1 className="text-display-sm text-on-surface">Billeteras</h1>
          <p className="mt-2 text-body-md text-on-surface-muted">
            Estado financiero de todos los usuarios del sistema
          </p>
        </div>
        <ExportButton entity="wallets" hasData={initialWallets.length > 0} />
      </div>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Usuario</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Disponible</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Retenido</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Total</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">Últ. actualización</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((wallet, i) => (
                  <tr
                    key={wallet.id}
                    className={`transition-colors duration-200 hover:bg-surface-low ${
                      i % 2 === 0 ? "bg-transparent" : "bg-surface-low/50"
                    }`}
                  >
                    <td className="py-4 text-body-sm font-medium text-on-surface">{wallet.userId}</td>
                    <td className="py-4 text-body-sm font-medium text-success">
                      {formatCurrency(wallet.availableBalance)}
                    </td>
                    <td className="py-4 text-body-sm text-info">
                      {formatCurrency(wallet.heldBalance)}
                    </td>
                    <td className="py-4 text-body-sm font-bold text-on-surface">
                      {formatCurrency(wallet.availableBalance + wallet.heldBalance)}
                    </td>
                    <td className="py-4 text-body-sm text-on-surface-muted">
                      {formatDate(wallet.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {initialWallets.length === 0 && (
            <p className="py-8 text-center text-body-sm text-on-surface-muted">
              No se encontraron billeteras en la base de datos.
            </p>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={initialWallets.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            className="mt-6"
          />
        </CardContent>
      </Card>
    </div>
  );
}
