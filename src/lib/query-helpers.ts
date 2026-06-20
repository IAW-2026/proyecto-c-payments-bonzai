/**
 * Helpers reutilizables para parseo de query params.
 * Usados por los endpoints de Control Plane y Analytics.
 */

/**
 * Parsea parámetros de paginación con valores seguros.
 */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "20"))
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Construye un objeto de paginación para la respuesta.
 */
export function buildPaginationResponse(
  page: number,
  limit: number,
  total: number
) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Parsea un rango de fechas desde query params `from` y `to`.
 * Devuelve un objeto Prisma-compatible para filtrar por `createdAt`.
 */
export function parseDateRange(searchParams: URLSearchParams) {
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from && !to) return undefined;

  const range: { gte?: Date; lte?: Date } = {};
  if (from) range.gte = new Date(from);
  if (to) range.lte = new Date(to);

  return range;
}

/**
 * Parsea un intervalo temporal para queries de analytics.
 * Valores válidos: "day", "week", "month". Default: "day".
 */
export function parseInterval(
  searchParams: URLSearchParams
): "day" | "week" | "month" {
  const interval = searchParams.get("interval");
  if (interval === "week" || interval === "month") return interval;
  return "day";
}

/**
 * Formatea montos Decimal de Prisma a number.
 */
export function toNumber(value: any): number {
  return Number(value || 0);
}
