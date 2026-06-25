import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MobileSidebar } from "@/components/admin/MobileSidebar";
import { cookies } from "next/headers";
import { getTranslations } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Panel Admin",
};

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

  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value || "en";
  const t = getTranslations(locale);

  const adminNavItems = [
    { href: "/admin", label: t("nav.adminDashboard"), icon: "📊" },
    { href: "/admin/analytics", label: t("nav.adminAnalytics"), icon: "📈" },
    { href: "/admin/transactions", label: t("nav.adminTransactions"), icon: "💳" },
    { href: "/admin/disputes", label: t("nav.adminDisputes"), icon: "⚖️" },
    { href: "/admin/ledger", label: t("nav.adminLedger"), icon: "📒" },
    { href: "/admin/wallets", label: t("nav.adminWallets"), icon: "👛" },
    { href: "/admin/simulator", label: t("nav.adminSimulator"), icon: "⚙️" },
  ];

  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Sidebar — tonal separation, no borders */}
        <aside className="hidden lg:flex w-64 flex-col bg-surface-mid">
          <div className="px-6 py-8">
            <p className="text-label-md text-secondary">{t("nav.admin")}</p>
            <h2 className="mt-1 text-headline-md text-on-surface">
              {t("nav.adminTitle")}
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

