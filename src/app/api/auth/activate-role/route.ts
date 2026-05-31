import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const rawRoles = (user.publicMetadata as any)?.roles;
    let roles: string[] = Array.isArray(rawRoles)
      ? rawRoles
      : rawRoles && typeof rawRoles === "object"
        ? Object.values(rawRoles)
        : [];

    if (!roles.includes("payments")) {
      roles.push("payments");
      
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          roles,
        },
      });
    }

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (error) {
    console.error("Error activating role:", error);
    return NextResponse.redirect(new URL("/activate-payments?error=true", req.url));
  }
}
