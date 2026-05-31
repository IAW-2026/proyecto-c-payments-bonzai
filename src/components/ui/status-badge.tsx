import { clsx } from "clsx";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

const statusConfig: Record<string, { label: string; dotClass: string; bgClass: string; textClass: string }> = {
  PENDING: {
    label: "Pendiente",
    dotClass: "bg-warning animate-pulse-soft",
    bgClass: "bg-warning-container",
    textClass: "text-warning",
  },
  HELD: {
    label: "Retenido",
    dotClass: "bg-info",
    bgClass: "bg-info/8",
    textClass: "text-info",
  },
  DELIVERED: {
    label: "Entregado",
    dotClass: "bg-secondary",
    bgClass: "bg-secondary-container",
    textClass: "text-secondary",
  },
  DISPUTED: {
    label: "En disputa",
    dotClass: "bg-error animate-pulse-soft",
    bgClass: "bg-error-container",
    textClass: "text-error",
  },
  COMPLETED: {
    label: "Completado",
    dotClass: "bg-success",
    bgClass: "bg-success-container",
    textClass: "text-success",
  },
  REFUNDED: {
    label: "Reembolsado",
    dotClass: "bg-on-surface-muted",
    bgClass: "bg-surface-high",
    textClass: "text-on-surface-variant",
  },
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    dotClass: "bg-on-surface-muted",
    bgClass: "bg-surface-mid",
    textClass: "text-on-surface-variant",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full font-semibold tracking-wide",
        config.bgClass,
        config.textClass,
        size === "sm"
          ? "px-2.5 py-0.5 text-[0.65rem] uppercase tracking-widest"
          : "px-3 py-1 text-xs uppercase tracking-widest"
      )}
    >
      <span
        className={clsx(
          "mr-1.5 inline-block rounded-full",
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
          config.dotClass
        )}
      />
      {config.label}
    </span>
  );
}
