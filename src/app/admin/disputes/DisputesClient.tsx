"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmModal } from "@/components/ui/modal";
import { ToastContainer, useToast } from "@/components/ui/toast";
import { ExportButton } from "@/components/ui/export-button";
import { useLanguage } from "@/lib/contexts/LanguageContext";

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

type ResolutionAction = "FAVOR_SELLER" | "PARTIAL_REFUND" | "FAVOR_BUYER";

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
  const { language } = useLanguage();

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat(language === "es" ? "es-AR" : "en-US", { style: "currency", currency: "ARS" }).format(amount);
  }

  function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat(language === "es" ? "es-AR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateStr));
  }

  const reasonLabels: Record<string, string> = {
    ITEM_NOT_RECEIVED: language === "es" ? "Producto no recibido" : "Item not received",
    ITEM_DAMAGED: language === "es" ? "Producto dañado" : "Item damaged",
    ITEM_NOT_AS_DESCRIBED: language === "es" ? "No coincide con la descripción" : "Not as described",
    WRONG_ITEM: language === "es" ? "Producto incorrecto" : "Wrong item",
    OTHER: language === "es" ? "Otro" : "Other",
  };

  const resolutionLabels: Record<string, string> = {
    FAVOR_BUYER: language === "es" ? "A favor del comprador" : "In favor of buyer",
    FAVOR_SELLER: language === "es" ? "A favor del vendedor" : "In favor of seller",
    PARTIAL_REFUND: language === "es" ? "Reembolso parcial" : "Partial refund",
  };

  const actionConfig: Record<
    ResolutionAction,
    { label: string; variant: "success" | "info" | "danger"; message: (orderId: string, amount: string) => string }
  > = {
    FAVOR_SELLER: {
      label: language === "es" ? "Favor vendedor" : "Favor seller",
      variant: "success",
      message: (orderId, amount) =>
        language === "es"
          ? `¿Estás seguro de resolver la disputa ${orderId} a favor del vendedor? El monto de ${amount} será liberado al vendedor.`
          : `Are you sure you want to resolve dispute ${orderId} in favor of the seller? The amount of ${amount} will be released to the seller.`,
    },
    PARTIAL_REFUND: {
      label: language === "es" ? "Reembolso parcial" : "Partial refund",
      variant: "info",
      message: (orderId, amount) =>
        language === "es"
          ? `¿Estás seguro de aplicar un reembolso parcial a la disputa ${orderId}? Se procesará un reembolso sobre el monto de ${amount}.`
          : `Are you sure you want to apply a partial refund to dispute ${orderId}? A refund on the amount of ${amount} will be processed.`,
    },
    FAVOR_BUYER: {
      label: language === "es" ? "Favor comprador" : "Favor buyer",
      variant: "danger",
      message: (orderId, amount) =>
        language === "es"
          ? `¿Estás seguro de resolver la disputa ${orderId} a favor del comprador? Se reembolsarán ${amount} al comprador.`
          : `Are you sure you want to resolve dispute ${orderId} in favor of the buyer? ${amount} will be refunded to the buyer.`,
    },
  };

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
          resolutionNotes: language === "es"
            ? `Disputa resuelta como ${modal.action} por el administrador.`
            : `Dispute resolved as ${modal.action} by the administrator.`,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || (language === "es" ? "Error al resolver la disputa" : "Error resolving dispute"));
      }

      const config = actionConfig[modal.action];
      addToast(
        language === "es"
          ? `Disputa ${modal.orderId} resuelta: ${config.label}`
          : `Dispute ${modal.orderId} resolved: ${config.label}`,
        modal.action === "FAVOR_BUYER" ? "info" : "success"
      );

      // Reload page to reflect resolved state
      window.location.reload();
    } catch (err: any) {
      addToast(err.message || (language === "es" ? "Error al procesar la resolución de disputa" : "Error processing dispute resolution"), "error");
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
          <p className="text-label-md text-secondary mb-2">
            {language === "es" ? "Resolución" : "Resolution"}
          </p>
          <h1 className="text-display-sm text-on-surface">
            {language === "es" ? "Disputas" : "Disputes"}
          </h1>
          <p className="mt-2 text-body-md text-on-surface-muted">
            {language === "es"
              ? "Gestión de reclamos y resolución de conflictos"
              : "Claims management and conflict resolution"}
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
                    <StatusBadge status={dispute.status} size="sm" locale={language} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-body-sm text-on-surface-variant">
                      <span className="font-medium text-on-surface">
                        {language === "es" ? "Motivo:" : "Reason:"}
                      </span>{" "}
                      {reasonLabels[dispute.reason] || dispute.reason}
                    </p>
                    <p className="text-body-sm text-on-surface-variant">
                      <span className="font-medium text-on-surface">
                        {language === "es" ? "Descripción:" : "Description:"}
                      </span>{" "}
                      {dispute.description || (language === "es" ? "Sin descripción proporcionada." : "No description provided.")}
                    </p>
                    <p className="text-label-sm text-on-surface-muted">
                      {language === "es" ? "Transacción:" : "Transaction:"} {dispute.transactionId} · {language === "es" ? "Abierta el" : "Opened on"}{" "}
                      <span suppressHydrationWarning>{formatDate(dispute.createdAt)}</span>
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
                        {language === "es" ? "Favor vendedor" : "Favor seller"}
                      </button>
                      <button
                        onClick={() => openConfirm(dispute, "PARTIAL_REFUND")}
                        className="rounded bg-info px-4 py-2 text-label-sm text-white transition-colors duration-300 hover:bg-info/80"
                      >
                        {language === "es" ? "Reembolso parcial" : "Partial refund"}
                      </button>
                      <button
                        onClick={() => openConfirm(dispute, "FAVOR_BUYER")}
                        className="rounded bg-error px-4 py-2 text-label-sm text-white transition-colors duration-300 hover:bg-error/80"
                      >
                        {language === "es" ? "Favor comprador" : "Favor buyer"}
                      </button>
                    </div>
                  )}
                  {dispute.status !== "DISPUTED" && dispute.resolution && (
                    <p className="text-body-sm font-semibold text-on-surface-muted">
                      {language === "es" ? "Resuelta:" : "Resolved:"} <span className="text-primary">{resolutionLabels[dispute.resolution] || dispute.resolution}</span>
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
          {language === "es" ? "No se encontraron disputas en el sistema." : "No disputes found in the system."}
        </p>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        open={modal.open}
        onClose={() => setModal((prev) => ({ ...prev, open: false }))}
        onConfirm={handleConfirm}
        title={language === "es" ? "Resolver disputa" : "Resolve dispute"}
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
