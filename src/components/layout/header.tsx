"use client";

import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function Header() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl" role="img" aria-label="planta">
            🌱
          </span>
          <span className="text-lg font-bold text-foreground group-hover:text-brand-600 transition-colors">
            Bonzai
          </span>
          <span className="hidden sm:inline-block text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Payments
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-4">
          {isLoaded && isSignedIn ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/transactions"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Transacciones
              </Link>
              <Link
                href="/dashboard/wallet"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Billetera
              </Link>
              <div className="ml-2 pl-4 border-l border-border">
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
      </div>
    </header>
  );
}
