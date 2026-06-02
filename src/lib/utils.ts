/**
 * Utilidades de formato para la app.
 */

/**
 * Formatea un valor numérico o Decimal como moneda ARS.
 */
export function formatCurrency(
  amount: number | string,
  currency: string = "ARS"
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
  }).format(num);
}

/**
 * Formatea una fecha de forma legible.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/**
 * Retorna el label y color de un estado de transacción.
 */
export function getStatusInfo(status: string): {
  label: string;
  color: string;
} {
  const map: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Pendiente", color: "amber" },
    HELD: { label: "Retenido", color: "blue" },
    DELIVERED: { label: "Entregado", color: "cyan" },
    DISPUTED: { label: "En disputa", color: "red" },
    COMPLETED: { label: "Completado", color: "green" },
    REFUNDED: { label: "Reembolsado", color: "purple" },
  };
  return map[status] || { label: status, color: "gray" };
}
