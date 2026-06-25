import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { preferenceClient } from "@/lib/mercadopago";

/**
 * GET /api/debug — Endpoint temporal para diagnosticar conexiones.
 * ELIMINAR en producción.
 */
export async function GET(request: NextRequest) {
  const results: Record<string, any> = {};

  // 1. Test DB
  try {
    const count = await db.transaction.count();
    results.database = { ok: true, transactionCount: count };
  } catch (e: any) {
    results.database = { ok: false, error: e.message };
  }

  // Clerk Info Diagnosis
  try {
    const { auth, clerkClient } = require("@clerk/nextjs/server");
    const session = await auth();
    results.clerk = {
      userId: session.userId,
      sessionClaimsMetadata: session.sessionClaims?.metadata,
    };
    if (session.userId) {
      const client = await clerkClient();

      const promote = request.nextUrl.searchParams.get("promoteAdmin") === "true";
      if (promote) {
        const user = await client.users.getUser(session.userId);
        const currentRoles = (user.publicMetadata as any)?.roles || [];
        const newRoles = Array.isArray(currentRoles) ? [...currentRoles] : [];
        if (!newRoles.includes("payments_admin")) newRoles.push("payments_admin");
        if (!newRoles.includes("admin")) newRoles.push("admin");
        if (!newRoles.includes("payments")) newRoles.push("payments");

        await client.users.updateUserMetadata(session.userId, {
          publicMetadata: {
            ...user.publicMetadata,
            roles: newRoles,
          },
        });
        results.clerk.promoted = true;
        results.clerk.newRoles = newRoles;
      }

      const user = await client.users.getUser(session.userId);
      results.clerk.publicMetadata = user.publicMetadata;
    }
  } catch (e: any) {
    results.clerk = { ok: false, error: e.message };
  }

  // 2. Test MP
  try {
    const hasToken = !!process.env.MP_ACCESS_TOKEN;
    const tokenPrefix = process.env.MP_ACCESS_TOKEN?.substring(0, 10) || "NOT SET";
    results.mercadopago = { ok: hasToken, tokenPrefix: tokenPrefix + "..." };
  } catch (e: any) {
    results.mercadopago = { ok: false, error: e.message };
  }

  // 3. Test MP Preference creation
  try {
    const pref = await preferenceClient.create({
      body: {
        items: [
          {
            id: "test",
            title: "Test Item",
            quantity: 1,
            unit_price: 100,
            currency_id: "ARS",
          },
        ],
        external_reference: "debug_test_" + Date.now(),
      },
    });
    results.mpPreference = {
      ok: true,
      id: pref.id,
      initPoint: pref.init_point,
      sandboxInitPoint: pref.sandbox_init_point,
    };
  } catch (e: any) {
    results.mpPreference = { ok: false, error: e.message };
  }

  return NextResponse.json(results);
}
