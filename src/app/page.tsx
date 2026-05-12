"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";

function HeroButtons() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return (
      <Link href="/dashboard">
        <Button size="lg">
          Ir al dashboard
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </Button>
      </Link>
    );
  }

  return (
    <>
      <Link href="/sign-up">
        <Button size="lg">
          Comenzar ahora
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </Button>
      </Link>
      <Link href="/sign-in">
        <Button variant="secondary" size="lg">
          Iniciar sesión
        </Button>
      </Link>
    </>
  );
}

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-background to-background dark:from-brand-950/30 dark:via-background dark:to-background" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-brand-600/10 rounded-full blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
            <div className="mx-auto max-w-2xl text-center animate-fade-in">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/50 px-4 py-1.5 text-sm text-brand-700 dark:text-brand-300">
                <span>🌱</span>
                <span>Marketplace Botánico</span>
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
                Pagos seguros para{" "}
                <span className="text-brand-600 dark:text-brand-400">
                  Bonzai
                </span>
              </h1>

              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Procesamos cobros, gestionamos billeteras y protegemos cada
                transacción del marketplace. Tu dinero, siempre seguro.
              </p>

              <div className="mt-10 flex items-center justify-center gap-4">
                <HeroButtons />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Todo lo que necesitás
              </h2>
              <p className="mt-4 text-muted-foreground">
                Una plataforma completa para gestionar el flujo financiero del
                marketplace.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  icon: "💳",
                  title: "Pagos con Mercado Pago",
                  desc: "Cobrá de forma segura con la plataforma de pagos más usada de Argentina.",
                },
                {
                  icon: "🔒",
                  title: "Fondos protegidos",
                  desc: "El dinero queda retenido hasta que se confirma la entrega. Protección para comprador y vendedor.",
                },
                {
                  icon: "⚖️",
                  title: "Resolución de disputas",
                  desc: "Sistema de reclamos con intervención de administradores para resolver conflictos.",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-xl border border-border bg-background p-6 transition-all duration-200 hover:shadow-lg hover:border-brand-500/30"
                >
                  <div className="mb-4 text-3xl">{feature.icon}</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { value: "ARS", label: "Moneda soportada" },
                { value: "24/7", label: "Procesamiento" },
                { value: "5%", label: "Comisión" },
                { value: "7 días", label: "Período de protección" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-brand-600 dark:text-brand-400">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
