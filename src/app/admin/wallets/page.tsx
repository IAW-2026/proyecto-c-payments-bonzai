import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billeteras — Admin",
};

const mockWallets = [
  { id: "w_001", userId: "user_b", availableBalance: 120000, heldBalance: 45000, updatedAt: "2026-04-28T18:00:00Z" },
  { id: "w_002", userId: "user_d", availableBalance: 85000, heldBalance: 22000, updatedAt: "2026-04-28T16:30:00Z" },
  { id: "w_003", userId: "user_f", availableBalance: 3200, heldBalance: 8500, updatedAt: "2026-04-27T14:15:00Z" },
  { id: "w_004", userId: "user_g", availableBalance: 0, heldBalance: 31000, updatedAt: "2026-04-26T11:00:00Z" },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateStr));
}

export default function AdminWalletsPage() {
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
                {mockWallets.map((wallet, i) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
