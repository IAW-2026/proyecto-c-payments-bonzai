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
        <button className="gradient-primary rounded px-8 py-4 text-base font-medium text-on-primary transition-all duration-300 hover:opacity-90 active:scale-[0.98]">
          Ir al dashboard
          <svg
            className="ml-2 inline-block h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link href="/sign-up">
        <button className="gradient-primary rounded px-8 py-4 text-base font-medium text-on-primary transition-all duration-300 hover:opacity-90 active:scale-[0.98]">
          Comenzar ahora
          <svg
            className="ml-2 inline-block h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>
      </Link>
      <Link href="/sign-in">
        <Button variant="secondary" size="lg">
          Iniciar sesión
        </Button>
      </Link>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1 pb-24">
        {/* ─── Hero Section ───────────────────────────── */}
        <section className="relative bg-surface">
          <div className="mx-auto max-w-7xl px-6 py-28 sm:py-36 lg:px-8">
            <div className="max-w-3xl animate-fade-in">
              {/* Museum label */}
              <p className="text-label-md text-secondary mb-6">
                Marketplace Botánico
              </p>

              {/* Display headline — Newsreader editorial */}
              <h1 className="text-display-lg text-on-surface">
                Pagos seguros para{" "}
                <em className="text-primary not-italic">Bonzai</em>
              </h1>

              {/* Body text — Manrope */}
              <p className="mt-8 max-w-xl text-body-lg text-on-surface-muted">
                Procesamos cobros, gestionamos billeteras y protegemos cada
                transacción del marketplace. Tu dinero, siempre seguro.
              </p>

              {/* CTA with Signature Gradient */}
              <div className="mt-12">
                <HeroButtons />
              </div>
            </div>
          </div>
        </section>

        {/* ─── Features — Tonal Shift Section ─────────── */}
        <section className="bg-surface-low">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
            <div className="max-w-xl mb-20">
              <p className="text-label-md text-secondary mb-4">
                Plataforma completa
              </p>
              <h2 className="text-display-sm text-on-surface">
                Todo lo que necesitás
              </h2>
              <p className="mt-4 text-body-md text-on-surface-muted">
                Una plataforma completa para gestionar el flujo financiero del
                marketplace.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
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
                  className="group rounded-xl bg-surface-lowest p-8 transition-all duration-300 hover:bg-surface"
                >
                  <div className="mb-5 text-3xl">{feature.icon}</div>
                  <h3 className="text-headline-md text-on-surface mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-body-md text-on-surface-muted leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Stats — Back to Surface ────────────────── */}
        <section className="bg-surface">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { value: "ARS", label: "Moneda soportada" },
                { value: "24/7", label: "Procesamiento" },
                { value: "5%", label: "Comisión" },
                { value: "7 días", label: "Período de protección" },
              ].map((stat) => (
                <div key={stat.label} className="text-left">
                  <div className="text-display-sm text-primary">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-label-md text-on-surface-muted">
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
