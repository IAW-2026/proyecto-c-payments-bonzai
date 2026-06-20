import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";

/**
 * Obtiene el userId de Clerk del request actual.
 * Lanza error si no está autenticado.
 */
export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }
  return userId;
}

/**
 * Obtiene los roles del usuario autenticado actual, con fallback al API de Clerk.
 */
export async function getRoles() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return [];

  let roles = (sessionClaims?.metadata as { roles?: string[] })?.roles ?? [];
  if (roles.length === 0) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const rawRoles = (user.publicMetadata as any)?.roles;
      roles = Array.isArray(rawRoles)
        ? rawRoles
        : rawRoles && typeof rawRoles === "object"
          ? Object.values(rawRoles)
          : [];
    } catch (error) {
      console.error("Error fetching roles from Clerk API:", error);
    }
  }
  return roles;
}

/**
 * Verifica que el usuario tenga uno de los roles requeridos.
 * Los roles se almacenan como metadata pública en Clerk.
 */
export async function requireRole(allowedRoles: string[]) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  const roles = await getRoles();
  const hasRole = allowedRoles.some((role) => roles.includes(role));

  if (!hasRole) {
    throw new Error("FORBIDDEN");
  }

  return { userId, roles };
}

/**
 * Obtiene datos completos del usuario actual.
 */
export async function getCurrentUser() {
  const user = await currentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
