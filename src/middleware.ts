import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Rutas que requieren autenticación
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/admin(.*)",
]);

// Rutas de la API que NO requieren auth (webhook de Mercado Pago)
const isPublicApiRoute = createRouteMatcher([
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // No proteger webhooks ni rutas públicas
  if (isPublicApiRoute(req)) return;

  // Proteger rutas que lo requieran
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Excluir archivos estáticos e internals de Next.js
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Siempre ejecutar para API routes
    "/(api|trpc)(.*)",
  ],
};
