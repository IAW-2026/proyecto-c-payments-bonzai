import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";

export default async function ActivatePaymentsPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const rawRoles = (user.publicMetadata as any)?.roles;
  const roles: string[] = Array.isArray(rawRoles)
    ? rawRoles
    : rawRoles && typeof rawRoles === "object"
      ? Object.values(rawRoles)
      : [];

  const hasPaymentsRole = roles.includes("payments") || roles.includes("payments_admin") || roles.includes("super_admin");

  // Si ya tiene el rol (ejemplo, se acaba de loguear y el sistema backend se lo dio, o refrescó la página), mandarlo al dashboard
  if (hasPaymentsRole) {
    redirect("/dashboard");
  }

  // NOTA: Acá deberías tener un botón que llame a una API propia tuya para asignarle el rol en Clerk,
  // o bien hacerlo automáticamente en el backend vía webhooks o server actions.
  // Por ahora dejamos el diseño de la pantalla de activación lista.

  return (
    <>
      <Header />
      <main className="flex flex-1 items-center justify-center bg-surface-low px-6 pb-24 pt-12">
        <div className="w-full max-w-lg animate-fade-in">
          <div className="mb-10 text-center">
            <p className="text-label-md text-secondary mb-2">Paso final</p>
            <h1 className="text-display-sm text-on-surface">Activar Payments</h1>
            <p className="mt-3 text-body-md text-on-surface-muted">
              Estás a un paso de habilitar tu billetera en Bonzai Payments
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-6">
                <span className="text-6xl inline-block mb-2">💳</span>
                
                <p className="text-body-md text-on-surface">
                  Hola <strong>{user.primaryEmailAddress?.emailAddress}</strong>. 
                  Tu cuenta ya existe en la red Bonzai, pero necesitás activar el módulo financiero.
                </p>

                <div className="bg-surface-lowest rounded-lg p-4 text-left border border-surface-high/50">
                  <h4 className="text-label-md text-on-surface font-semibold mb-2">Al activar obtendrás:</h4>
                  <ul className="space-y-2 text-body-sm text-on-surface-muted">
                    <li className="flex items-center gap-2"><span>✅</span> Billetera virtual Bonzai</li>
                    <li className="flex items-center gap-2"><span>✅</span> Historial de cobros y pagos</li>
                    <li className="flex items-center gap-2"><span>✅</span> Centro de resolución de disputas</li>
                  </ul>
                </div>

                <form action="/api/auth/activate-role" method="POST">
                  {/* Acá irá el llamado al endpoint que asigna el rol y redirige */}
                  <button 
                    type="submit"
                    className="w-full inline-flex items-center justify-center font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded bg-primary text-on-primary hover:bg-primary-container h-12 px-7 text-base gap-2.5"
                  >
                    Habilitar Payments
                  </button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
