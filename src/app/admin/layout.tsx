import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MobileSidebar } from "@/components/admin/MobileSidebar";

export const metadata: Metadata = {
  title: "Panel Admin",
};

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/transactions", label: "Transacciones", icon: "💳" },
  { href: "/admin/disputes", label: "Disputas", icon: "⚖️" },
  { href: "/admin/ledger", label: "Libro Mayor", icon: "📒" },
  { href: "/admin/wallets", label: "Billeteras", icon: "👛" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Validar rol de administrador
  // Asumiendo que los roles vienen en sessionClaims.roles o sessionClaims.metadata.roles
  const claims = sessionClaims as any;
  const roles: string[] = claims?.roles || claims?.metadata?.roles || [];
  
  if (!roles.includes("payments_admin") && !roles.includes("super_admin")) {
    redirect("/dashboard");
  }

  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Sidebar — tonal separation, no borders */}
        <aside className="hidden lg:flex w-64 flex-col bg-surface-mid">
          <div className="px-6 py-8">
            <p className="text-label-md text-secondary">Administración</p>
            <h2 className="mt-1 text-headline-md text-on-surface">
              Payments
            </h2>
          </div>
          <nav className="flex-1 px-4 space-y-0.5">
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-body-sm text-on-surface-variant transition-all duration-300 hover:text-on-surface hover:bg-surface-low"
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Mobile nav — Drawer (Client Component) */}
        <MobileSidebar navItems={adminNavItems} />

        {/* Content — surface background for contrast with sidebar */}
        <main className="flex-1 overflow-y-auto bg-surface-low">
          <div className="mx-auto max-w-6xl px-6 py-10 pb-28 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
