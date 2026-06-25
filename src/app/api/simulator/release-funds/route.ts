import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getRoles } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const roles = await getRoles();
    if (!roles.includes("payments_admin") && !roles.includes("admin") && !roles.includes("super_admin")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json();
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Se requiere transactionId." },
        { status: 400 }
      );
    }

    const controlPlaneKey = process.env.CONTROL_PLANE_API_KEY || "cp_secret_change_me";
    const requestUrl = new URL(request.url);
    const releaseUrl = `${requestUrl.protocol}//${requestUrl.host}/api/control-plane/transactions/${transactionId}/release-funds`;

    console.log(`[simulator-release-funds] Forwarding mock funds release to: ${releaseUrl} for transaction ${transactionId}`);

    const response = await fetch(releaseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": controlPlaneKey,
      },
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { text: responseText };
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      responseReceived: responseData,
    });
  } catch (error: any) {
    console.error("[simulator-release-funds] Error calling release-funds endpoint:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message },
      { status: 500 }
    );
  }
}
