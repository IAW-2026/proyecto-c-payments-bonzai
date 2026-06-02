"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

export function TransactionFilters({ basePath = "/admin/transactions" }: { basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    
    // Al filtrar, volvemos a la página 1 implícitamente
    router.push(`${basePath}?${params.toString()}`);
  }, [q, status, router, basePath]);

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-4 sm:flex-row w-full">
      <div className="flex-1">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por ID, orden, comprador o vendedor..."
          className="w-full border-0 border-b-2 border-surface-high bg-transparent px-1 py-3 text-body-sm text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:outline-none transition-colors duration-300"
        />
      </div>
      <div className="flex gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="flex-1 border-0 border-b-2 border-surface-high bg-transparent px-1 py-3 text-body-sm text-on-surface focus:border-primary focus:outline-none transition-colors duration-300 min-w-[150px]"
        >
          <option value="">Todos los estados</option>
          <option value="PENDING">Pendiente</option>
          <option value="HELD">Retenido</option>
          <option value="DELIVERED">Entregado</option>
          <option value="DISPUTED">En disputa</option>
          <option value="COMPLETED">Completado</option>
          <option value="REFUNDED">Reembolsado</option>
        </select>
        <button
          type="submit"
          className="bg-primary text-on-primary px-4 py-2 rounded-lg text-label-md font-medium transition-transform hover:scale-105 active:scale-95"
        >
          Filtrar
        </button>
      </div>
    </form>
  );
}
