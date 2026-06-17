import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateM2MAuth } from "@/lib/m2m-auth";
import {
  parsePagination,
  buildPaginationResponse,
  toNumber,
} from "@/lib/query-helpers";

/**
 * GET /api/control-plane/wallets
 * Listar todas las wallets de vendedores con paginación.
 * Consumido por: Control Plane
 *
 * Query params:
 *   - page, limit: paginación
 *   - search: buscar por userId
 */
export async function GET(request: NextRequest) {
  const authError = validateM2MAuth(request, "control-plane");
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const where: any = {};

    const search = searchParams.get("search");
    if (search) {
      where.userId = { contains: search, mode: "insensitive" };
    }

    const [wallets, total] = await Promise.all([
      db.wallet.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      db.wallet.count({ where }),
    ]);

    return NextResponse.json({
      wallets: wallets.map((w: any) => ({
        id: w.id,
        userId: w.userId,
        availableBalance: toNumber(w.availableBalance),
        heldBalance: toNumber(w.heldBalance),
        totalBalance:
          toNumber(w.availableBalance) + toNumber(w.heldBalance),
        updatedAt: w.updatedAt.toISOString(),
      })),
      pagination: buildPaginationResponse(page, limit, total),
    });
  } catch (error) {
    console.error("[control-plane/wallets] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al consultar wallets." },
      { status: 500 }
    );
  }
}
