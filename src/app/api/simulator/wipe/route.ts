import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { getRoles } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const roles = await getRoles();
    if (!roles.includes("payments_admin") && !roles.includes("admin") && !roles.includes("super_admin")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    console.log("🧹 Iniciando el vaciado de las tablas financieras de PostgreSQL desde el simulador...");
    
    // Ejecutar TRUNCATE en cascada para vaciar todas las tablas respetando claves foráneas
    await db.$executeRawUnsafe(
      `TRUNCATE TABLE "disputes", "ledger_entries", "payments", "transactions", "checkout_sessions", "wallets" CASCADE;`
    );

    return NextResponse.json({
      success: true,
      message: "Todas las tablas financieras de la base de datos fueron vaciadas con éxito.",
    });
  } catch (error: any) {
    console.error("[wipe-db] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message || "Error al vaciar las tablas de la base de datos." },
      { status: 500 }
    );
  }
}
