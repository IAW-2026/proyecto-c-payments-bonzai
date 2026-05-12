import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Billetera</h1>
        <p className="mt-1 text-muted-foreground">
          Tu saldo y movimientos financieros
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-transparent" />
          <CardHeader className="relative pb-2">
            <CardDescription>Saldo total</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(mockWallet.total)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{mockWallet.currency}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              Disponible
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(mockWallet.availableBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Listo para retirar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
              Retenido
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(mockWallet.heldBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">En período de protección</p>
          </CardContent>
        </Card>
      </div>

      {/* Movements */}
      <Card>
        <CardHeader>
          <CardTitle>Últimos movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockMovements.map((mov) => (
              <div
                key={mov.id}
                className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      mov.type === "CREDIT"
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {mov.type === "CREDIT" ? "↓" : "↑"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {mov.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(mov.createdAt)}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-sm font-semibold ${
                    mov.type === "CREDIT"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
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
