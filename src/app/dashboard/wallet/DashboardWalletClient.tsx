"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Pagination, paginateArray } from "@/components/ui/pagination";

const PAGE_SIZE = 20;

interface WalletData {
  userId: string;
  availableBalance: number;
  heldBalance: number;
  total: number;
  currency: string;
}

interface Movement {
  id: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  description: string;
  createdAt: string;
}

interface DashboardWalletClientProps {
  initialWallet: WalletData;
  initialMovements: Movement[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateStr));
}

export default function DashboardWalletClient({ initialWallet, initialMovements }: DashboardWalletClientProps) {
  const [page, setPage] = useState(1);
  const { data: movements, totalPages } = paginateArray(initialMovements, page, PAGE_SIZE);

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Editorial Header */}
      <div>
        <p className="text-label-md text-secondary mb-2">Finanzas</p>
        <h1 className="text-display-sm text-on-surface">Billetera</h1>
        <p className="mt-2 text-body-md text-on-surface-muted">
          Tu saldo y movimientos financieros
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Total — with gradient accent */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <CardHeader className="relative pb-2">
            <CardDescription>
              <span className="text-label-md">Saldo total</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-headline-lg text-on-surface">
              {formatCurrency(initialWallet.total)}
            </p>
            <p className="text-label-sm text-on-surface-muted mt-1">{initialWallet.currency}</p>
          </CardContent>
        </Card>

        {/* Available */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-success" />
              <span className="text-label-md">Disponible</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-headline-lg text-success">
              {formatCurrency(initialWallet.availableBalance)}
            </p>
            <p className="text-label-sm text-on-surface-muted mt-1">Listo para retirar</p>
          </CardContent>
        </Card>

        {/* Held */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-info" />
              <span className="text-label-md">Retenido</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-headline-lg text-info">
              {formatCurrency(initialWallet.heldBalance)}
            </p>
            <p className="text-label-sm text-on-surface-muted mt-1">En período de protección</p>
          </CardContent>
        </Card>
      </div>

      {/* Movements */}
      <Card>
        <CardHeader>
          <h2 className="text-headline-md text-on-surface">Últimos movimientos</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {movements.map((mov, i) => (
              <div
                key={mov.id}
                className={`flex items-center justify-between rounded-lg px-4 py-4 transition-colors duration-200 hover:bg-surface-low ${
                  i % 2 === 0 ? "bg-transparent" : "bg-surface-low/40"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
                      mov.type === "CREDIT"
                        ? "bg-success-container text-success"
                        : "bg-error-container text-error"
                    }`}
                  >
                    {mov.type === "CREDIT" ? "↓" : "↑"}
                  </div>
                  <div>
                    <p className="text-body-sm font-medium text-on-surface">
                      {mov.description}
                    </p>
                    <p className="text-label-sm text-on-surface-muted" suppressHydrationWarning>
                      {formatDate(mov.createdAt)}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-body-sm font-semibold ${
                    mov.type === "CREDIT"
                      ? "text-success"
                      : "text-error"
                  }`}
                >
                  {mov.type === "CREDIT" ? "+" : "-"}
                  {formatCurrency(mov.amount)}
                </p>
              </div>
            ))}
          </div>

          {initialMovements.length === 0 && (
            <p className="py-8 text-center text-body-sm text-on-surface-muted">
              No tienes movimientos financieros registrados.
            </p>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={initialMovements.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            className="mt-4"
          />
        </CardContent>
      </Card>
    </div>
  );
}
