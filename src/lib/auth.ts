import { auth, currentUser } from "@clerk/nextjs/server";

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
 * Verifica que el usuario tenga uno de los roles requeridos.
 * Los roles se almacenan como metadata pública en Clerk.
 */
export async function requireRole(allowedRoles: string[]) {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  const roles = (sessionClaims?.metadata as { roles?: string[] })?.roles ?? [];
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
