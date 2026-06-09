"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmModal } from "@/components/ui/modal";
import { ToastContainer, useToast } from "@/components/ui/toast";
import { ExportButton } from "@/components/ui/export-button";

interface Dispute {
  id: string;
  transactionId: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  reason: string;
  description: string;
  status: string;
  createdAt: string;
  resolution: string | null;
  resolvedAt: string | null;
}

interface DisputesClientProps {
  initialDisputes: Dispute[];
}

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

const resolutionLabels: Record<string, string> = {
  FAVOR_BUYER: "A favor del comprador",
  FAVOR_SELLER: "A favor del vendedor",
  PARTIAL_REFUND: "Reembolso parcial",
};

type ResolutionAction = "FAVOR_SELLER" | "PARTIAL_REFUND" | "FAVOR_BUYER";

const actionConfig: Record<
  ResolutionAction,
  { label: string; variant: "success" | "info" | "danger"; message: (orderId: string, amount: string) => string }
> = {
  FAVOR_SELLER: {
    label: "Favor vendedor",
    variant: "success",
    message: (orderId, amount) =>
      `¿Estás seguro de resolver la disputa ${orderId} a favor del vendedor? El monto de ${amount} será liberado al vendedor.`,
  },
  PARTIAL_REFUND: {
    label: "Reembolso parcial",
    variant: "info",
    message: (orderId, amount) =>
      `¿Estás seguro de aplicar un reembolso parcial a la disputa ${orderId}? Se procesará un reembolso sobre el monto de ${amount}.`,
  },
  FAVOR_BUYER: {
    label: "Favor comprador",
    variant: "danger",
    message: (orderId, amount) =>
      `¿Estás seguro de resolver la disputa ${orderId} a favor del comprador? Se reembolsarán ${amount} al comprador.`,
  },
};

export default function DisputesClient({ initialDisputes }: DisputesClientProps) {
  const [modal, setModal] = useState<{
    open: boolean;
    disputeId: string;
    action: ResolutionAction;
    orderId: string;
    amount: number;
  }>({ open: false, disputeId: "", action: "FAVOR_SELLER", orderId: "", amount: 0 });

  const [loading, setLoading] = useState(false);
  const { toasts, addToast, dismissToast } = useToast();

  function openConfirm(dispute: Dispute, action: ResolutionAction) {
    setModal({
      open: true,
      disputeId: dispute.id,
      action,
      orderId: dispute.orderId,
      amount: dispute.amount,
    });
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const response = await fetch(`/api/payments/${modal.orderId}/resolve-dispute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resolution: modal.action,
          refundAmount: modal.action === "PARTIAL_REFUND" ? modal.amount : undefined,
          resolutionNotes: `Disputa resuelta como ${modal.action} por el administrador.`,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Error al resolver la disputa");
      }

      const config = actionConfig[modal.action];
      addToast(
        `Disputa ${modal.orderId} resuelta: ${config.label}`,
        modal.action === "FAVOR_BUYER" ? "info" : "success"
      );

      // Reload page to reflect resolved state
      window.location.reload();
    } catch (err: any) {
      addToast(err.message || "Error al procesar la resolución de disputa", "error");
    } finally {
      setLoading(false);
      setModal((prev) => ({ ...prev, open: false }));
    }
  }

  const currentConfig = actionConfig[modal.action];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Editorial Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label-md text-secondary mb-2">Resolución</p>
          <h1 className="text-display-sm text-on-surface">Disputas</h1>
          <p className="mt-2 text-body-md text-on-surface-muted">
            Gestión de reclamos y resolución de conflictos
          </p>
        </div>
        <ExportButton entity="disputes" hasData={initialDisputes.length > 0} />
      </div>

      <div className="space-y-4">
        {initialDisputes.map((dispute) => (
          <Card key={dispute.id} hover>
            <CardContent>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-headline-md text-on-surface">
                      {dispute.orderId}
                    </h3>
                    <StatusBadge status={dispute.status} size="sm" />
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
                    {formatCurrency(dispute.amount)}
                  </p>
                  {dispute.status === "DISPUTED" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openConfirm(dispute, "FAVOR_SELLER")}
                        className="rounded bg-success px-4 py-2 text-label-sm text-white transition-colors duration-300 hover:bg-success/80"
                      >
                        Favor vendedor
                      </button>
                      <button
                        onClick={() => openConfirm(dispute, "PARTIAL_REFUND")}
                        className="rounded bg-info px-4 py-2 text-label-sm text-white transition-colors duration-300 hover:bg-info/80"
                      >
                        Reembolso parcial
                      </button>
                      <button
                        onClick={() => openConfirm(dispute, "FAVOR_BUYER")}
                        className="rounded bg-error px-4 py-2 text-label-sm text-white transition-colors duration-300 hover:bg-error/80"
                      >
                        Favor comprador
                      </button>
                    </div>
                  )}
                  {dispute.status !== "DISPUTED" && dispute.resolution && (
                    <p className="text-body-sm font-semibold text-on-surface-muted">
                      Resuelta: <span className="text-primary">{resolutionLabels[dispute.resolution] || dispute.resolution}</span>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {initialDisputes.length === 0 && (
        <p className="py-8 text-center text-body-sm text-on-surface-muted">
          No se encontraron disputas en el sistema.
        </p>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        open={modal.open}
        onClose={() => setModal((prev) => ({ ...prev, open: false }))}
        onConfirm={handleConfirm}
        title="Resolver disputa"
        message={currentConfig ? currentConfig.message(modal.orderId, formatCurrency(modal.amount)) : ""}
        confirmLabel={currentConfig ? currentConfig.label : ""}
        variant={currentConfig ? currentConfig.variant : "info"}
        loading={loading}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
