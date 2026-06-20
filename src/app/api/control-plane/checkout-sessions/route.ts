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
 * GET /api/control-plane/checkout-sessions
 * Listar checkout sessions con sus pagos asociados.
 * Permite al Control Plane ver el flujo completo de carritos multi-vendedor.
 *
 * Consumido por: Control Plane
 *
 * Query params:
 *   - page, limit: paginación
 *   - status: filtrar por estado
 *   - from, to: rango de fechas
 *   - buyerId: filtrar por comprador
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
    if (status) where.status = status;

    const buyerId = searchParams.get("buyerId");
    if (buyerId) where.buyerId = buyerId;

    if (dateRange) where.createdAt = dateRange;

    const [sessions, total] = await Promise.all([
      db.checkoutSession.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          _count: { select: { transactions: true } },
          payments: {
            select: {
              id: true,
              provider: true,
              providerStatus: true,
              externalId: true,
            },
          },
        },
      }),
      db.checkoutSession.count({ where }),
    ]);

    return NextResponse.json({
      sessions: sessions.map((s: any) => ({
        id: s.id,
        buyerId: s.buyerId,
        totalAmount: toNumber(s.totalAmount),
        status: s.status,
        transactionCount: s._count.transactions,
        payments: s.payments.map((p: any) => ({
          id: p.id,
          provider: p.provider,
          providerStatus: p.providerStatus,
          externalId: p.externalId,
        })),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      pagination: buildPaginationResponse(page, limit, total),
    });
  } catch (error) {
    console.error("[control-plane/checkout-sessions] Error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "Error al consultar checkout sessions.",
      },
      { status: 500 }
    );
  }
}
