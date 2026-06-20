import { NextRequest, NextResponse } from "next/server";

/**
 * Validación M2M (Machine-to-Machine) por header.
 *
 * Cada aplicación externa (Control Plane, Analytics Dashboard)
 * envía un header `x-api-key` que se valida contra la variable
 * de entorno correspondiente.
 *
 * El backend de Control Plane se encarga de verificar que el
 * usuario tenga el rol `super_admin` en su lado.
 */

type M2MService = "control-plane" | "analytics";

const SERVICE_ENV_MAP: Record<M2MService, string> = {
  "control-plane": "CONTROL_PLANE_API_KEY",
  "analytics": "ANALYTICS_API_KEY",
};

/**
 * Valida que el request tenga un header `x-api-key` válido
 * para el servicio indicado.
 *
 * @returns `null` si la autenticación es exitosa, o un `NextResponse` con error.
 */
export function validateM2MAuth(
  request: NextRequest,
  service: M2MService
): NextResponse | null {
  const envVar = SERVICE_ENV_MAP[service];
  const expectedKey = process.env[envVar];

  if (!expectedKey) {
    console.error(
      `[m2m-auth] ❌ ${envVar} is not configured in environment variables!`
    );
    return NextResponse.json(
      {
        error: "SERVICE_MISCONFIGURED",
        message: `La API key del servicio ${service} no está configurada.`,
      },
      { status: 500 }
    );
  }

  const apiKey = request.headers.get("x-api-key");

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: "Header x-api-key es requerido.",
      },
      { status: 401 }
    );
  }

  if (apiKey !== expectedKey) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "API key inválida.",
      },
      { status: 403 }
    );
  }

  return null; // Auth OK
}

/**
 * Higher-order wrapper: valida M2M auth y ejecuta el handler.
 */
export function withM2MAuth(
  service: M2MService,
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]) => {
    const authError = validateM2MAuth(request, service);
    if (authError) return authError;
    return handler(request, ...args);
  };
}
