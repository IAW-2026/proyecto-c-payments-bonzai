import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getRoles } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const roles = await getRoles();
    if (!roles.includes("payments_admin") && !roles.includes("admin") && !roles.includes("super_admin")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const client = await clerkClient();
    const response = await client.users.getUserList({
      limit: 100,
    });

    const simulatedUsers = response.data
      .filter((user) => {
        const email = user.emailAddresses[0]?.emailAddress || "";
        const publicMetadata = user.publicMetadata as any;
        return email.endsWith("@bonzai.com") || (publicMetadata && Array.isArray(publicMetadata.roles));
      })
      .map((user) => {
        const publicMetadata = user.publicMetadata as any;
        const firstName = user.firstName || "";
        const lastName = user.lastName || "";
        const name = `${firstName} ${lastName}`.trim() || user.username || "Usuario Sin Nombre";
        return {
          id: user.id,
          name,
          email: user.emailAddresses[0]?.emailAddress || "",
          roles: Array.isArray(publicMetadata?.roles) ? publicMetadata.roles : [],
        };
      })
      .sort((a, b) => {
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      });

    return NextResponse.json(simulatedUsers);
  } catch (error: any) {
    console.error("[simulator-users] Error listing Clerk users:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message },
      { status: 500 }
    );
  }
}
