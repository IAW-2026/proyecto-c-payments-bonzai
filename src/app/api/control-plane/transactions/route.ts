import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateM2MAuth } from "@/lib/m2m-auth";
import {
  parsePagination,
  parseDateRange,
  buildPaginationResponse,
  toNumber,
} from "@/lib/query-helpers";

/**
 * GET /api/control-plane/transactions
 * Listar todas las transacciones del sistema con filtros avanzados.
 * Consumido por: Control Plane
 *
 * Query params:
 *   - page, limit: paginación
 *   - status: filtrar por estado (PENDING, HELD, DELIVERED, COMPLETED, DISPUTED, REFUNDED)
 *   - from, to: rango de fechas (ISO 8601)
 *   - buyerId: filtrar por comprador
 *   - sellerId: filtrar por vendedor
 *   - search: buscar por orderId
 */
export async function GET(request: NextRequest) {
  const authError = validateM2MAuth(request, "control-plane");
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);
    const dateRange = parseDateRange(searchParams);

    // Build where clause
    const where: any = {};

    const status = searchParams.get("status");
    if (status) where.status = status;

    const buyerId = searchParams.get("buyerId");
    if (buyerId) where.buyerId = buyerId;

    const sellerId = searchParams.get("sellerId");
    if (sellerId) where.sellerId = sellerId;

    const search = searchParams.get("search");
    if (search) {
      where.orderId = { contains: search, mode: "insensitive" };
    }

    if (dateRange) where.createdAt = dateRange;

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          dispute: { select: { id: true, reason: true, resolution: true } },
        },
      }),
      db.transaction.count({ where }),
    ]);

    return NextResponse.json({
      transactions: transactions.map((t: any) => ({
        id: t.id,
        checkoutSessionId: t.checkoutSessionId,
        orderId: t.orderId,
        buyerId: t.buyerId,
        sellerId: t.sellerId,
        amount: toNumber(t.amount),
        commissionRate: toNumber(t.commissionRate),
        commissionAmount: toNumber(t.commissionAmount),
        netAmount: toNumber(t.netAmount),
        status: t.status,
        currency: t.currency,
        hasDispute: !!t.dispute,
        dispute: t.dispute
          ? {
              id: t.dispute.id,
              reason: t.dispute.reason,
              resolution: t.dispute.resolution,
            }
          : null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      pagination: buildPaginationResponse(page, limit, total),
    });
  } catch (error) {
    console.error("[control-plane/transactions] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al consultar transacciones." },
      { status: 500 }
    );
  }
}
