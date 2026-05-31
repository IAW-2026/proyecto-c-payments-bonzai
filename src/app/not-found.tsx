import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="max-w-md animate-fade-in">
          <span className="text-6xl">🌿</span>
          <p className="mt-6 text-label-md text-secondary">Página no encontrada</p>
          <h1 className="mt-2 text-display-lg text-on-surface">404</h1>
          <p className="mt-4 text-body-lg text-on-surface-muted">
            Esta página no existe… como una planta sin raíces.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded bg-primary px-6 py-3 text-sm font-medium text-on-primary transition-all duration-300 hover:bg-primary-container"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Volver al inicio
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
