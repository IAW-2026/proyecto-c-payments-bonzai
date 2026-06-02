"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <Header />
      <main className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="max-w-md animate-fade-in">
          <span className="text-6xl">🥀</span>
          <h1 className="mt-8 text-display-sm text-on-surface">
            Algo salió mal
          </h1>
          <p className="mt-4 text-body-md text-on-surface-muted">
            Ocurrió un error inesperado. Podés intentar de nuevo o volver al
            inicio.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <Button onClick={reset}>Reintentar</Button>
            <Button
              variant="secondary"
              onClick={() => (window.location.href = "/")}
            >
              Ir al inicio
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
