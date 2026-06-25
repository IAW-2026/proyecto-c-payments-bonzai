"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/contexts/LanguageContext";

function HeroButtons() {
  const { isSignedIn, isLoaded } = useAuth();
  const { t } = useLanguage();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return (
      <Link href="/dashboard">
        <button className="gradient-primary rounded px-8 py-4 text-base font-medium text-on-primary transition-all duration-300 hover:opacity-90 active:scale-[0.98]">
          {t("hero.btnGoToDashboard")}
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
          {t("hero.btnGetStarted")}
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
          {t("hero.btnSignIn")}
        </Button>
      </Link>
    </div>
  );
}

export default function HomePage() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <>
      <Header />
      <div className="absolute top-6 right-6 z-40">
        <button
          onClick={() => setLanguage(language === "en" ? "es" : "en")}
          className="glass ghost-border flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-low shadow-ambient transition-all duration-300 active:scale-95 cursor-pointer"
          title={language === "en" ? "Cambiar a Español" : "Switch to English"}
        >
          <span>{language === "en" ? "🇬🇧" : "🇪🇸"}</span>
          <span className="uppercase tracking-wider">{language === "en" ? "English" : "Español"}</span>
        </button>
      </div>
      <main className="flex-1 pb-24">
        {/* ─── Hero Section ───────────────────────────── */}
        <section className="relative bg-surface">
          <div className="mx-auto max-w-7xl px-6 py-28 sm:py-36 lg:px-8">
            <div className="max-w-3xl animate-fade-in">
              {/* Museum label */}
              <p className="text-label-md text-secondary mb-6">
                {t("hero.p")}
              </p>

              {/* Display headline — Newsreader editorial */}
              <h1 className="text-display-lg text-on-surface">
                {t("hero.h1")}{" "}
                <em className="text-primary not-italic">Bonzai</em>
              </h1>

              {/* Body text — Manrope */}
              <p className="mt-8 max-w-xl text-body-lg text-on-surface-muted">
                {t("hero.desc")}
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
                {t("features.subtitle")}
              </p>
              <h2 className="text-display-sm text-on-surface">
                {t("features.title")}
              </h2>
              <p className="mt-4 text-body-md text-on-surface-muted">
                {t("features.desc")}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: "💳",
                  title: t("features.mercadoPago.title"),
                  desc: t("features.mercadoPago.desc"),
                },
                {
                  icon: "🔒",
                  title: t("features.protectedFunds.title"),
                  desc: t("features.protectedFunds.desc"),
                },
                {
                  icon: "⚖️",
                  title: t("features.disputes.title"),
                  desc: t("features.disputes.desc"),
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
                { value: "ARS", label: t("stats.currency") },
                { value: "24/7", label: t("stats.processing") },
                { value: "5%", label: t("stats.commission") },
                { value: t("stats.protectionValue"), label: t("stats.protection") },
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

