import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="es"
        className={`${newsreader.variable} ${manrope.variable} h-full`}
      >
        <body className="min-h-full flex flex-col">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
