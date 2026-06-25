"use client";

import { useState } from "react";
import Link from "next/link";
import { SignUp, SignIn } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type CheckStatus = "idle" | "loading" | "available" | "exists_no_role" | "exists_role";

export function EmailCheckSignUp() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<CheckStatus>("idle");
  const [error, setError] = useState("");

  const handleCheck = async () => {
    if (!email.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Ingresá un correo electrónico válido");
      return;
    }

    setError("");
    setStatus("loading");

    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) throw new Error("Error comprobando el correo");

      const data = await res.json();

      if (!data.exists) {
        setStatus("available");
      } else if (data.hasPaymentsRole) {
        setStatus("exists_role");
      } else {
        setStatus("exists_no_role");
      }
    } catch {
      setError("Ocurrió un error. Por favor intentá de nuevo.");
      setStatus("idle");
    }
  };

  if (status === "available") {
    return (
      <SignUp
        routing="hash"
        signInUrl="/sign-in"
        forceRedirectUrl="/activate-payments"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-ambient rounded-xl",
          },
        }}
      />
    );
  }

  if (status === "exists_no_role") {
    return (
      <div className="mx-auto w-full max-w-md animate-fade-in space-y-6">
        <div className="text-center">
          <p className="text-label-md text-secondary mb-2">Cuenta existente</p>
          <h3 className="text-display-sm text-on-surface">Sumate a Payments</h3>
          <p className="mt-3 text-body-md text-on-surface-muted">
            <strong>{email}</strong> ya tiene una cuenta en la red Bonzai. Iniciá sesión con tu contraseña para habilitar Payments.
          </p>
        </div>
        
        <SignIn
          routing="hash"
          signUpUrl="/sign-up"
          forceRedirectUrl="/activate-payments"
          initialValues={{ emailAddress: email }}
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-ambient rounded-xl",
            },
          }}
        />
        
        <div className="text-center mt-4">
          <Button
            variant="ghost"
            onClick={() => setStatus("idle")}
          >
            Usar un correo distinto
          </Button>
        </div>
      </div>
    );
  }

  if (status === "exists_role") {
    return (
      <div className="mx-auto w-full max-w-md animate-fade-in">
        <Card>
          <CardContent className="pt-6 text-center">
            <h3 className="text-headline-md text-on-surface mb-3">Ya estás registrado</h3>
            <p className="text-body-md text-on-surface-muted mb-8">
              El correo <strong>{email}</strong> ya pertenece a una cuenta de Payments activa. Por favor iniciá sesión.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/sign-in" className="w-full">
                <Button className="w-full" size="lg">Iniciar sesión</Button>
              </Link>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStatus("idle")}
              >
                Usar un correo distinto
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md animate-fade-in">
      <div className="mb-10 text-center">
        <p className="text-label-md text-secondary mb-2">Registro</p>
        <h1 className="text-display-sm text-on-surface">Crear cuenta</h1>
        <p className="mt-3 text-body-md text-on-surface-muted">
          Ingresá tu correo para comenzar
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-label-sm text-on-surface-muted font-medium">
                Correo electrónico
              </label>
              <input
                type="email"
                className="w-full border-0 border-b-2 border-surface-high bg-transparent px-1 py-3 text-body-md text-on-surface placeholder:text-on-surface-muted/50 focus:border-primary focus:outline-none transition-colors duration-300"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCheck(); }}
                autoFocus
                disabled={status === "loading"}
              />
              {error && <p className="text-error text-body-sm mt-1">{error}</p>}
            </div>

            <Button 
              className="w-full" 
              size="lg" 
              onClick={handleCheck}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Comprobando..." : "Continuar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
