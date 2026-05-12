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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Billeteras</h1>
        <p className="mt-1 text-muted-foreground">
          Estado financiero de todos los usuarios del sistema
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Usuario</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Disponible</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Retenido</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Últ. actualización</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockWallets.map((wallet) => (
                  <tr key={wallet.id} className="hover:bg-muted/50 transition-colors">
                    <td className="py-3 text-sm font-medium text-foreground">{wallet.userId}</td>
                    <td className="py-3 text-sm font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(wallet.availableBalance)}
                    </td>
                    <td className="py-3 text-sm text-blue-600 dark:text-blue-400">
                      {formatCurrency(wallet.heldBalance)}
                    </td>
                    <td className="py-3 text-sm font-bold text-foreground">
                      {formatCurrency(wallet.availableBalance + wallet.heldBalance)}
                    </td>
                    <td className="py-3 text-sm text-muted-foreground">
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
