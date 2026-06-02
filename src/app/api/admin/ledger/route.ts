import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/admin/ledger
 * Consulta el libro mayor completo.
 * Consumido por: Panel Admin / Control Plane
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      db.ledgerEntry.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.ledgerEntry.count(),
    ]);

    return NextResponse.json({
      entries: entries.map((e: any) => ({
        id: e.id,
        userId: e.userId,
        transactionId: e.transactionId,
        type: e.type,
        amount: Number(e.amount),
        description: e.description,
        createdAt: e.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[admin/ledger] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al consultar libro mayor." },
      { status: 500 }
    );
  }
}
