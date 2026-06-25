import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { esES, enUS } from "@clerk/localizations";
import { cookies } from "next/headers";
import { LanguageProvider } from "@/lib/contexts/LanguageContext";
import { Newsreader, Manrope } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Bonzai Payments",
    template: "%s | Bonzai Payments",
  },
  description:
    "Gestión de pagos, cobros y transacciones del marketplace botánico Bonzai. Procesá pagos de forma segura con Mercado Pago.",
  keywords: [
    "pagos",
    "marketplace",
    "plantas",
    "bonzai",
    "mercado pago",
    "transacciones",
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value || "en";

  return (
    <ClerkProvider localization={locale === "es" ? esES : enUS}>
      <html
        lang={locale}
        className={`${newsreader.variable} ${manrope.variable} h-full`}
      >
        <body className="min-h-full flex flex-col">
          <LanguageProvider initialLanguage={locale}>
            {children}
          </LanguageProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

