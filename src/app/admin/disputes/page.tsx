import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disputas — Admin",
};

const mockDisputes = [
  { id: "d_001", transactionId: "txn_004", orderId: "ord_104", buyerId: "user_e", sellerId: "user_b", amount: 5200, reason: "ITEM_DAMAGED", description: "Uno de los tres productos llegó roto.", status: "DISPUTED", createdAt: "2026-04-27T10:20:00Z" },
  { id: "d_002", transactionId: "txn_012", orderId: "ord_112", buyerId: "user_a", sellerId: "user_d", amount: 18700, reason: "ITEM_NOT_RECEIVED", description: "Nunca recibí el paquete.", status: "DISPUTED", createdAt: "2026-04-26T15:30:00Z" },
  { id: "d_003", transactionId: "txn_019", orderId: "ord_119", buyerId: "user_c", sellerId: "user_b", amount: 9300, reason: "WRONG_ITEM", description: "Me mandaron una suculenta en vez de un bonsai.", status: "DISPUTED", createdAt: "2026-04-25T08:45:00Z" },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateStr));
}

const reasonLabels: Record<string, string> = {
  ITEM_NOT_RECEIVED: "Producto no recibido",
  ITEM_DAMAGED: "Producto dañado",
  ITEM_NOT_AS_DESCRIBED: "No coincide con la descripción",
  WRONG_ITEM: "Producto incorrecto",
  OTHER: "Otro",
};

export default function AdminDisputesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Disputas</h1>
        <p className="mt-1 text-muted-foreground">
          Gestión de reclamos y resolución de conflictos
        </p>
      </div>

      <div className="space-y-4">
        {mockDisputes.map((dispute) => (
          <Card key={dispute.id} hover>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-foreground">
                      {dispute.orderId}
                    </h3>
                    <StatusBadge status={dispute.status} size="sm" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Motivo:</span>{" "}
                      {reasonLabels[dispute.reason] || dispute.reason}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Descripción:</span>{" "}
                      {dispute.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Transacción: {dispute.transactionId} • Abierta el{" "}
                      {formatDate(dispute.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(dispute.amount)}
                  </p>
                  <div className="flex gap-2">
                    <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors">
                      Favor vendedor
                    </button>
                    <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors">
                      Reembolso parcial
                    </button>
                    <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors">
                      Favor comprador
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
