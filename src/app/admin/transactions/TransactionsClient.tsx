"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Pagination, paginateArray } from "@/components/ui/pagination";
import { ExportButton } from "@/components/ui/export-button";
import { useLanguage } from "@/lib/contexts/LanguageContext";

const PAGE_SIZE = 20;

interface Transaction {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface TransactionsClientProps {
  initialTransactions: Transaction[];
}

export default function TransactionsClient({ initialTransactions }: TransactionsClientProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { language } = useLanguage();

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat(language === "es" ? "es-AR" : "en-US", { style: "currency", currency: "ARS" }).format(amount);
  }

  function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat(language === "es" ? "es-AR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateStr));
  }

  // Filter
  const filtered = useMemo(() => {
    return initialTransactions.filter((txn) => {
      const matchesStatus = !statusFilter || txn.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        txn.id.toLowerCase().includes(q) ||
        txn.orderId.toLowerCase().includes(q) ||
        txn.buyerId.toLowerCase().includes(q) ||
        txn.sellerId.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [initialTransactions, search, statusFilter]);

  // Paginate
  const { data: transactions, totalPages } = paginateArray(filtered, page, PAGE_SIZE);

  // Reset page when filters change
  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Editorial Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label-md text-secondary mb-2">
            {language === "es" ? "Auditoría" : "Audit"}
          </p>
          <h1 className="text-display-sm text-on-surface">
            {language === "es" ? "Transacciones" : "Transactions"}
          </h1>
          <p className="mt-2 text-body-md text-on-surface-muted">
            {language === "es"
              ? "Gestión y auditoría de todas las transacciones del sistema"
              : "Management and audit of all system transactions"}
          </p>
        </div>
        <ExportButton
          entity="transactions"
          filters={statusFilter ? { status: statusFilter } : {}}
          hasData={filtered.length > 0}
        />
      </div>

      {/* Search & Filters — minimalist */}
      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <input
                type="text"
                placeholder={language === "es" ? "Buscar por ID, orden, comprador o vendedor..." : "Search by ID, order, buyer or seller..."}
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full border-0 border-b-2 border-surface-high bg-transparent px-1 py-3 text-body-sm text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:outline-none transition-colors duration-300"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="border-0 border-b-2 border-surface-high bg-transparent px-1 py-3 text-body-sm text-on-surface focus:border-primary focus:outline-none transition-colors duration-300"
            >
              <option value="">{language === "es" ? "Todos los estados" : "All statuses"}</option>
              <option value="PENDING">{language === "es" ? "Pendiente" : "Pending"}</option>
              <option value="HELD">{language === "es" ? "Retenido" : "Held"}</option>
              <option value="DELIVERED">{language === "es" ? "Entregado" : "Delivered"}</option>
              <option value="DISPUTED">{language === "es" ? "En disputa" : "Disputed"}</option>
              <option value="COMPLETED">{language === "es" ? "Completado" : "Completed"}</option>
              <option value="REFUNDED">{language === "es" ? "Reembolsado" : "Refunded"}</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">ID</th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">
                    {language === "es" ? "Orden" : "Order"}
                  </th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">
                    {language === "es" ? "Comprador" : "Buyer"}
                  </th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">
                    {language === "es" ? "Vendedor" : "Seller"}
                  </th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">
                    {language === "es" ? "Monto" : "Amount"}
                  </th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">
                    {language === "es" ? "Estado" : "Status"}
                  </th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">
                    {language === "es" ? "Fecha" : "Date"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn, i) => (
                  <tr
                    key={txn.id}
                    className={`transition-colors duration-200 hover:bg-surface-low ${
                      i % 2 === 0 ? "bg-transparent" : "bg-surface-low/50"
                    }`}
                  >
                    <td className="py-4 text-body-sm font-mono text-on-surface-muted">{txn.id}</td>
                    <td className="py-4 text-body-sm text-on-surface">{txn.orderId}</td>
                    <td className="py-4 text-body-sm text-on-surface-muted">{txn.buyerId}</td>
                    <td className="py-4 text-body-sm text-on-surface-muted">{txn.sellerId}</td>
                    <td className="py-4 text-body-sm font-medium text-on-surface">{formatCurrency(txn.amount)}</td>
                    <td className="py-4"><StatusBadge status={txn.status} size="sm" locale={language} /></td>
                    <td className="py-4 text-body-sm text-on-surface-muted whitespace-nowrap" suppressHydrationWarning>{formatDate(txn.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <p className="py-8 text-center text-body-sm text-on-surface-muted">
              {language === "es"
                ? "No se encontraron transacciones con los filtros aplicados."
                : "No transactions found matching the filters."}
            </p>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            className="mt-6"
          />
        </CardContent>
      </Card>
    </div>
  );
}

