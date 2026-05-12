import { clsx } from "clsx";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  PENDING: {
    label: "Pendiente",
    classes: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  HELD: {
    label: "Retenido",
    classes: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  DELIVERED: {
    label: "Entregado",
    classes: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
  DISPUTED: {
    label: "En disputa",
    classes: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  COMPLETED: {
    label: "Completado",
    classes: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  REFUNDED: {
    label: "Reembolsado",
    classes: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    classes: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border font-medium",
        config.classes,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      <span
        className={clsx(
          "mr-1.5 inline-block rounded-full",
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
          status === "PENDING" && "bg-amber-500 animate-pulse-soft",
          status === "HELD" && "bg-blue-500",
          status === "DELIVERED" && "bg-cyan-500",
          status === "DISPUTED" && "bg-red-500 animate-pulse-soft",
          status === "COMPLETED" && "bg-green-500",
          status === "REFUNDED" && "bg-purple-500"
        )}
      />
      {config.label}
    </span>
  );
}
