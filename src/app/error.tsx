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
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <span className="text-6xl">🥀</span>
          <h1 className="mt-6 text-2xl font-bold text-foreground">
            Algo salió mal
          </h1>
          <p className="mt-2 text-muted-foreground max-w-md">
            Ocurrió un error inesperado. Podés intentar de nuevo o volver al
            inicio.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
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
