import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Disputas — Admin",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

function formatDate(dateStr: Date | string): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateStr));
}

const reasonLabels: Record<string, string> = {
  ITEM_NOT_RECEIVED: "Producto no recibido",
  ITEM_DAMAGED: "Producto dañado",
  ITEM_NOT_AS_DESCRIBED: "No coincide con la descripción",
  WRONG_ITEM: "Producto incorrecto",
  OTHER: "Otro",
};

export default async function AdminDisputesPage() {
  const disputes = await db.dispute.findMany({
    include: { transaction: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Editorial Header */}
      <div>
        <p className="text-label-md text-secondary mb-2">Resolución</p>
        <h1 className="text-display-sm text-on-surface">Disputas</h1>
        <p className="mt-2 text-body-md text-on-surface-muted">
          Gestión de reclamos y resolución de conflictos
        </p>
      </div>

      <div className="space-y-4">
        {disputes.map((dispute) => (
          <Card key={dispute.id} hover>
            <CardContent>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-headline-md text-on-surface">
                      {dispute.transaction.orderId}
                    </h3>
                    <StatusBadge status={dispute.transaction.status} size="sm" />
                    {dispute.resolution && (
                      <span className="inline-flex items-center rounded-full bg-surface-high px-2 py-0.5 text-xs font-medium text-on-surface-variant">
                        Resuelta: {dispute.resolution}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-body-sm text-on-surface-variant">
                      <span className="font-medium text-on-surface">Motivo:</span>{" "}
                      {reasonLabels[dispute.reason] || dispute.reason}
                    </p>
                    <p className="text-body-sm text-on-surface-variant">
                      <span className="font-medium text-on-surface">Descripción:</span>{" "}
                      {dispute.description || "Sin descripción proporcionada."}
                    </p>
                    <p className="text-label-sm text-on-surface-muted">
                      Transacción: {dispute.transactionId} · Abierta el{" "}
                      {formatDate(dispute.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-4">
                  <p className="text-headline-lg text-on-surface">
                    {formatCurrency(Number(dispute.transaction.amount))}
                  </p>
                  {!dispute.resolution && (
                    <div className="flex gap-2 flex-wrap justify-end">
                      <button className="rounded bg-success px-4 py-2 text-label-sm text-white transition-colors duration-300 hover:bg-success/80">
                        Favor vendedor
                      </button>
                      <button className="rounded bg-info px-4 py-2 text-label-sm text-white transition-colors duration-300 hover:bg-info/80">
                        Reembolso parcial
                      </button>
                      <button className="rounded bg-error px-4 py-2 text-label-sm text-white transition-colors duration-300 hover:bg-error/80">
                        Favor comprador
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {disputes.length === 0 && (
          <div className="py-12 text-center text-on-surface-muted border-2 border-dashed border-surface-high rounded-xl">
            No hay disputas registradas en el sistema.
          </div>
        )}
      </div>
    </div>
  );
}
