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
 * GET /api/control-plane/disputes
 * Listar todas las disputas del sistema con filtros.
 * Consumido por: Control Plane
 *
 * Query params:
 *   - page, limit: paginación
 *   - status: "pending" (sin resolver) | "resolved" (con resolvedAt)
 *   - reason: filtrar por motivo (ITEM_NOT_RECEIVED, ITEM_DAMAGED, etc.)
 *   - from, to: rango de fechas
 */
export async function GET(request: NextRequest) {
  const authError = validateM2MAuth(request, "control-plane");
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);
    const dateRange = parseDateRange(searchParams);

    const where: any = {};

    const status = searchParams.get("status");
    if (status === "pending") {
      where.resolvedAt = null;
    } else if (status === "resolved") {
      where.resolvedAt = { not: null };
    }

    const reason = searchParams.get("reason");
    if (reason) where.reason = reason;

    if (dateRange) where.createdAt = dateRange;

    const [disputes, total] = await Promise.all([
      db.dispute.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          transaction: {
            select: {
              id: true,
              orderId: true,
              buyerId: true,
              sellerId: true,
              amount: true,
              status: true,
            },
          },
        },
      }),
      db.dispute.count({ where }),
    ]);

    return NextResponse.json({
      disputes: disputes.map((d: any) => ({
        id: d.id,
        transactionId: d.transactionId,
        reason: d.reason,
        description: d.description,
        resolution: d.resolution,
        resolutionNotes: d.resolutionNotes,
        refundAmount: d.refundAmount ? toNumber(d.refundAmount) : null,
        createdAt: d.createdAt.toISOString(),
        resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
        transaction: {
          id: d.transaction.id,
          orderId: d.transaction.orderId,
          buyerId: d.transaction.buyerId,
          sellerId: d.transaction.sellerId,
          amount: toNumber(d.transaction.amount),
          status: d.transaction.status,
        },
      })),
      pagination: buildPaginationResponse(page, limit, total),
    });
  } catch (error) {
    console.error("[control-plane/disputes] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al consultar disputas." },
      { status: 500 }
    );
  }
}
