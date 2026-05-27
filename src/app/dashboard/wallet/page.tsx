import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billetera",
};

// Mock data
const mockWallet = {
  userId: "user_222",
  availableBalance: 120000,
  heldBalance: 45000,
  total: 165000,
  currency: "ARS",
};

const mockMovements = [
  { id: "le_01", type: "CREDIT" as const, amount: 14250, description: "Pago recibido — ord_101", createdAt: "2026-04-28T14:30:00Z" },
  { id: "le_02", type: "CREDIT" as const, amount: 8075, description: "Pago retenido — ord_102", createdAt: "2026-04-28T12:15:00Z" },
  { id: "le_03", type: "DEBIT" as const, amount: 12160, description: "Reembolso — ord_106", createdAt: "2026-04-25T09:10:00Z" },
  { id: "le_04", type: "CREDIT" as const, amount: 20900, description: "Pago recibido — ord_103", createdAt: "2026-04-24T18:45:00Z" },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateStr));
}

export default function WalletPage() {
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
              {formatCurrency(mockWallet.total)}
            </p>
            <p className="text-label-sm text-on-surface-muted mt-1">{mockWallet.currency}</p>
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
              {formatCurrency(mockWallet.availableBalance)}
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
              {formatCurrency(mockWallet.heldBalance)}
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
            {mockMovements.map((mov, i) => (
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
                    <p className="text-label-sm text-on-surface-muted">
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
        </CardContent>
      </Card>
    </div>
  );
}
