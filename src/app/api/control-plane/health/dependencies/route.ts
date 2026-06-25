import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateM2MAuth } from "@/lib/m2m-auth";

/**
 * GET /api/control-plane/health/dependencies
 * Health check de las dependencias externas del sistema:
 * - Database (Neon PostgreSQL)
 * - MercadoPago SDK
 * - Clerk Auth
 *
 * Consumido por: Control Plane
 */
export async function GET(request: NextRequest) {
  const authError = validateM2MAuth(request, "control-plane");
  if (authError) return authError;

  const services: Record<
    string,
    { status: "up" | "down"; latencyMs: number; error?: string }
  > = {};

  // 1. Database (Neon)
  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    services.database = {
      status: "up",
      latencyMs: Date.now() - dbStart,
    };
  } catch (error: any) {
    services.database = {
      status: "down",
      latencyMs: 0,
      error: error.message,
    };
  }

  // 2. MercadoPago — verificar que el access token esté configurado
  try {
    const mpStart = Date.now();
    const hasToken = !!process.env.MP_ACCESS_TOKEN;
    services.mercadopago = {
      status: hasToken ? "up" : "down",
      latencyMs: Date.now() - mpStart,
      ...(hasToken ? {} : { error: "MP_ACCESS_TOKEN not configured" }),
    };
  } catch (error: any) {
    services.mercadopago = {
      status: "down",
      latencyMs: 0,
      error: error.message,
    };
  }

  // 3. Clerk — verificar que las keys estén configuradas
  try {
    const clerkStart = Date.now();
    const hasClerkKey = !!process.env.CLERK_SECRET_KEY;
    services.clerk = {
      status: hasClerkKey ? "up" : "down",
      latencyMs: Date.now() - clerkStart,
      ...(hasClerkKey ? {} : { error: "CLERK_SECRET_KEY not configured" }),
    };
  } catch (error: any) {
    services.clerk = {
      status: "down",
      latencyMs: 0,
      error: error.message,
    };
  }

  // Determinar estado global
  const allUp = Object.values(services).every((s) => s.status === "up");

  return NextResponse.json({
    status: allUp ? "healthy" : "degraded",
    services,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
}
