"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DisputeActionsProps {
  orderId: string;
}

export function DisputeActions({ orderId }: DisputeActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleResolve = async (resolution: "FAVOR_SELLER" | "FAVOR_BUYER") => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/payments/${orderId}/resolve-dispute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resolution }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Error al resolver la disputa");
      }

      alert("Disputa resuelta con éxito");
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-2 flex-wrap justify-end">
      <button
        onClick={() => handleResolve("FAVOR_SELLER")}
        disabled={isLoading}
        className="rounded bg-success px-4 py-2 text-label-sm text-white transition-colors duration-300 hover:bg-success/80 disabled:opacity-50"
      >
        Favor vendedor
      </button>
      <button
        onClick={() => handleResolve("FAVOR_BUYER")}
        disabled={isLoading}
        className="rounded bg-error px-4 py-2 text-label-sm text-white transition-colors duration-300 hover:bg-error/80 disabled:opacity-50"
      >
        Favor comprador
      </button>
    </div>
  );
}
