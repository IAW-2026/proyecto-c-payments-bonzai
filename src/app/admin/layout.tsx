import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <div className="flex flex-1">
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

        {/* Mobile nav — tonal strip */}
        <div className="lg:hidden bg-surface-mid px-4 py-2 w-full">
          <nav className="flex gap-1 overflow-x-auto">
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-label-sm text-on-surface-variant transition-all duration-300 hover:text-on-surface hover:bg-surface-low"
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

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
