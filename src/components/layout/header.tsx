"use client";

import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

/* Bonsai tree SVG — placeholder for the real brand icon */
function BonsaiIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-label="Bonzai"
    >
      {/* Trunk */}
      <rect x="14.5" y="18" width="3" height="8" rx="1" fill="currentColor" opacity="0.7" />
      {/* Canopy layers */}
      <ellipse cx="16" cy="14" rx="8" ry="5" fill="currentColor" opacity="0.25" />
      <ellipse cx="16" cy="12" rx="6.5" ry="4.5" fill="currentColor" opacity="0.4" />
      <ellipse cx="16" cy="10" rx="5" ry="4" fill="currentColor" opacity="0.6" />
      {/* Base / soil line */}
      <rect x="10" y="26" width="12" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

export function Header() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <header className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-slide-up">
      <nav className="glass ghost-border flex items-center gap-1 rounded-full px-2 py-2 shadow-ambient">
        {/* Home trigger — Bonsai icon */}
        <Link
          href="/"
          className="flex items-center justify-center rounded-full p-2.5 text-primary transition-colors duration-300 hover:bg-surface-low"
          aria-label="Inicio"
        >
          <BonsaiIcon className="h-6 w-6" />
        </Link>

        {isLoaded && isSignedIn ? (
          <>
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/dashboard/analytics">Analíticas</NavLink>
            <NavLink href="/dashboard/transactions">Transacciones</NavLink>
            <NavLink href="/dashboard/wallet">Billetera</NavLink>
            <NavLink href="/dashboard/simulator">Simulador</NavLink>

            <div className="ml-1 pl-2">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8",
                  },
                }}
              />
            </div>
          </>
        ) : isLoaded ? (
          <>
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Iniciar sesión
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button variant="primary" size="sm">
                Registrarse
              </Button>
            </Link>
          </>
        ) : null}
      </nav>
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-full px-4 py-2 text-sm font-medium text-on-surface-variant transition-all duration-300 hover:bg-surface-low hover:text-on-surface"
    >
      {children}
    </Link>
  );
}
