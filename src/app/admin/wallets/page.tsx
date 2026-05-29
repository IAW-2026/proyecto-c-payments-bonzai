import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Billeteras — Admin",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

function formatDate(dateStr: Date | string): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateStr));
}

export default async function AdminWalletsPage() {
  const wallets = await db.wallet.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50, // Límite temporal hasta implementar paginación real
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Editorial Header */}
      <div>
        <p className="text-label-md text-secondary mb-2">Usuarios</p>
        <h1 className="text-display-sm text-on-surface">Billeteras</h1>
        <p className="mt-2 text-body-md text-on-surface-muted">
          Estado financiero de todos los usuarios del sistema
        </p>
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
                      {formatCurrency(Number(wallet.availableBalance))}
                    </td>
                    <td className="py-4 text-body-sm text-info">
                      {formatCurrency(Number(wallet.heldBalance))}
                    </td>
                    <td className="py-4 text-body-sm font-bold text-on-surface">
                      {formatCurrency(Number(wallet.availableBalance) + Number(wallet.heldBalance))}
                    </td>
                    <td className="py-4 text-body-sm text-on-surface-muted">
                      {formatDate(wallet.updatedAt)}
                    </td>
                  </tr>
                ))}
                {wallets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-on-surface-muted">
                      No hay billeteras registradas en el sistema.
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
