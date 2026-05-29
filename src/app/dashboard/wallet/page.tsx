import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Billetera",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

function formatDate(dateStr: Date | string): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateStr));
}

export default async function WalletPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  let wallet = await db.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    wallet = await db.wallet.create({
      data: {
        userId,
        availableBalance: 0,
        heldBalance: 0,
      },
    });
  }

  const movements = await db.ledgerEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const total = Number(wallet.availableBalance) + Number(wallet.heldBalance);

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
              {formatCurrency(total)}
            </p>
            <p className="text-label-sm text-on-surface-muted mt-1">ARS</p>
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
              {formatCurrency(Number(wallet.availableBalance))}
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
              {formatCurrency(Number(wallet.heldBalance))}
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
                      {mov.description || "Movimiento"}
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
                  {formatCurrency(Number(mov.amount))}
                </p>
              </div>
            ))}
            {movements.length === 0 && (
              <div className="py-8 text-center text-on-surface-muted">
                No tienes movimientos registrados.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
