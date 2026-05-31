import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Email is required." },
        { status: 400 }
      );
    }

    const client = await clerkClient();
    const users = await client.users.getUserList({
      emailAddress: [email],
    });

    if (users.data.length === 0) {
      return NextResponse.json({ exists: false });
    }

    const user = users.data[0];
    const rawRoles = (user.publicMetadata as any)?.roles;
    const roles: string[] = Array.isArray(rawRoles)
      ? rawRoles
      : rawRoles && typeof rawRoles === "object"
        ? Object.values(rawRoles)
        : [];

    return NextResponse.json({
      exists: true,
      hasPaymentsRole: roles.includes("payments") || roles.includes("payments_admin") || roles.includes("super_admin"),
      roles,
    });
  } catch (error) {
    console.error("Error checking email:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Error checking email." },
      { status: 500 }
    );
  }
}
