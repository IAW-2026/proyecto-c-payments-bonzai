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
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Se requiere orderId." },
        { status: 400 }
      );
    }

    const shippingKey = process.env.SHIPPING_API_KEY || "test-shipping-key-123";
    const requestUrl = new URL(request.url);
    const deliveryUrl = `${requestUrl.protocol}//${requestUrl.host}/api/payments/${orderId}/delivered`;

    console.log(`[simulator-delivery] Forwarding mock delivery to: ${deliveryUrl} for order ${orderId}`);

    const response = await fetch(deliveryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shipping-key": shippingKey,
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
    console.error("[simulator-delivery] Error calling delivery endpoint:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message },
      { status: 500 }
    );
  }
}
