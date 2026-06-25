"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { LineChart, DonutChart } from "@/components/ui/charts";
import { useLanguage } from "@/lib/contexts/LanguageContext";

interface TransactionData {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  commissionAmount: number;
  netAmount: number;
  status: string;
  createdAt: string;
}

interface AnalyticsClientProps {
  userId: string;
  initialTransactions: TransactionData[];
}

type DateRange = "7d" | "30d" | "ytd" | "all";

export default function AnalyticsClient({ userId, initialTransactions }: AnalyticsClientProps) {
  const [range, setRange] = useState<DateRange>("30d");
  const { language } = useLanguage();

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat(language === "es" ? "es-AR" : "en-US", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  }

  // Parse transaction dates once
  const transactions = useMemo(() => {
    return initialTransactions.map((t) => ({
      ...t,
      date: new Date(t.createdAt),
    }));
  }, [initialTransactions]);

  // Determine starting date based on range
  const filterStartDate = useMemo(() => {
    const now = new Date();
    const start = new Date();
    if (range === "7d") {
      start.setDate(now.getDate() - 7);
    } else if (range === "30d") {
      start.setDate(now.getDate() - 30);
    } else if (range === "ytd") {
      start.setMonth(0, 1); // Jan 1st
    } else {
      return null; // All time
    }
    start.setHours(0, 0, 0, 0);
    return start;
  }, [range]);

  // Filter transactions in range
  const filteredTransactions = useMemo(() => {
    if (!filterStartDate) return transactions;
    return transactions.filter((t) => t.date >= filterStartDate);
  }, [transactions, filterStartDate]);

  // Compute metrics in range
  const metrics = useMemo(() => {
    let salesVolume = 0;
    let salesCount = 0;
    let purchasesVolume = 0;
    let purchasesCount = 0;
    let commissionsPaid = 0;
    let completedCount = 0;
    let totalCount = filteredTransactions.length;

    filteredTransactions.forEach((t) => {
      const isSeller = t.sellerId === userId;
      const isBuyer = t.buyerId === userId;
      const isCompleted = t.status === "COMPLETED";

      if (isCompleted) {
        completedCount++;
        if (isSeller) {
          salesVolume += t.amount;
          salesCount++;
          commissionsPaid += t.commissionAmount;
        }
        if (isBuyer) {
          purchasesVolume += t.amount;
          purchasesCount++;
        }
      }
    });

    const successRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return {
      salesVolume,
      salesCount,
      purchasesVolume,
      purchasesCount,
      commissionsPaid,
      successRate,
      totalCount,
    };
  }, [filteredTransactions, userId]);

  // Chronological Grouping for Line Chart
  const chartData = useMemo(() => {
    const grouped: { [key: string]: { sales: number; purchases: number } } = {};
    const labels: string[] = [];

    const now = new Date();

    if (range === "7d" || range === "30d") {
      // Group by Day
      const days = range === "7d" ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const key = d.toLocaleDateString(language === "es" ? "es-AR" : "en-US", { day: "2-digit", month: "short" });
        labels.push(key);
        grouped[key] = { sales: 0, purchases: 0 };
      }

      filteredTransactions.forEach((t) => {
        if (t.status !== "COMPLETED") return;
        const key = t.date.toLocaleDateString(language === "es" ? "es-AR" : "en-US", { day: "2-digit", month: "short" });
        if (grouped[key]) {
          if (t.sellerId === userId) grouped[key].sales += t.amount;
          if (t.buyerId === userId) grouped[key].purchases += t.amount;
        }
      });
    } else {
      // Group by Month (YTD or All Time)
      // Determine starting month
      let startMonth = 0;
      let startYear = now.getFullYear();

      if (range === "all" && transactions.length > 0) {
        const firstTx = transactions[0].date;
        startMonth = firstTx.getMonth();
        startYear = firstTx.getFullYear();
      }

      const totalMonths = (now.getFullYear() - startYear) * 12 + (now.getMonth() - startMonth) + 1;
      const monthLimit = Math.max(1, Math.min(12, totalMonths)); // cap labels to last 12 months for clarity if it's huge

      for (let i = monthLimit - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i, 1);
        const key = d.toLocaleDateString(language === "es" ? "es-AR" : "en-US", { month: "short", year: "2-digit" });
        labels.push(key);
        grouped[key] = { sales: 0, purchases: 0 };
      }

      filteredTransactions.forEach((t) => {
        if (t.status !== "COMPLETED") return;
        const key = t.date.toLocaleDateString(language === "es" ? "es-AR" : "en-US", { month: "short", year: "2-digit" });
        if (grouped[key]) {
          if (t.sellerId === userId) grouped[key].sales += t.amount;
          if (t.buyerId === userId) grouped[key].purchases += t.amount;
        }
      });
    }

    return labels.map((label) => ({
      label,
      value: grouped[label].sales,
      secondaryValue: grouped[label].purchases,
    }));
  }, [filteredTransactions, range, userId, transactions, language]);

  // Donut status breakdown
  const statusBreakdown = useMemo(() => {
    const counts: { [key: string]: number } = {
      COMPLETED: 0,
      PENDING: 0,
      HELD: 0,
      DELIVERED: 0,
      DISPUTED: 0,
      REFUNDED: 0,
    };

    filteredTransactions.forEach((t) => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++;
      }
    });

    const mapping = [
      { key: "COMPLETED", label: language === "es" ? "Completadas" : "Completed", color: "var(--success)" },
      { key: "PENDING", label: language === "es" ? "Pendientes" : "Pending", color: "var(--warning)" },
      { key: "HELD", label: language === "es" ? "Retenidas (Custodia)" : "Held (Escrow)", color: "var(--secondary)" },
      { key: "DELIVERED", label: language === "es" ? "Entregadas" : "Delivered", color: "var(--info)" },
      { key: "DISPUTED", label: language === "es" ? "En Disputa" : "Disputed", color: "var(--error)" },
      { key: "REFUNDED", label: language === "es" ? "Reembolsadas" : "Refunded", color: "var(--on-surface-muted)" },
    ];

    return mapping
      .map((item) => ({
        label: item.label,
        value: counts[item.key],
        color: segColor(item.key),
      }))
      .filter((d) => d.value > 0);
  }, [filteredTransactions, language]);

  function segColor(status: string) {
    if (status === "COMPLETED") return "#2d6a4f"; // Success
    if (status === "PENDING") return "#9a6700"; // Warning
    if (status === "HELD") return "#526347"; // Secondary
    if (status === "DELIVERED") return "#2b6cb0"; // Info
    if (status === "DISPUTED") return "#9b2c2c"; // Error
    return "#74796e"; // Muted
  }

  // Top 5 largest transactions
  const topTransactions = useMemo(() => {
    return [...filteredTransactions]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredTransactions]);

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Editorial Header & Date Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-label-md text-secondary mb-2">
            {language === "es" ? "Panel de usuario" : "User Panel"}
          </p>
          <h1 className="text-display-sm text-on-surface">
            {language === "es" ? "Analíticas de Usuario" : "User Analytics"}
          </h1>
          <p className="mt-2 text-body-md text-on-surface-muted">
            {language === "es"
              ? "Estadísticas y evolución de tus ventas, compras y comisiones en Bonzai."
              : "Statistics and history of your sales, purchases, and commissions on Bonzai."}
          </p>
        </div>

        {/* Date Filters — Glassmorphic Switch */}
        <div className="flex bg-surface-mid/60 border border-outline-variant/10 p-1 rounded-full w-fit">
          {[
            { id: "7d", label: language === "es" ? "7 Días" : "7 Days" },
            { id: "30d", label: language === "es" ? "30 Días" : "30 Days" },
            { id: "ytd", label: language === "es" ? "Este Año" : "YTD" },
            { id: "all", label: language === "es" ? "Todo" : "All" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setRange(item.id as DateRange)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all duration-300 ${
                range === item.id
                  ? "bg-primary text-on-primary shadow-ambient-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: language === "es" ? "Ingresos (Ventas)" : "Earnings (Sales)",
            value: formatCurrency(metrics.salesVolume),
            subtitle: language === "es" ? `${metrics.salesCount} ventas exitosas` : `${metrics.salesCount} successful sales`,
            icon: "🌿",
            color: "text-success",
          },
          {
            title: language === "es" ? "Gastos (Compras)" : "Expenses (Purchases)",
            value: formatCurrency(metrics.purchasesVolume),
            subtitle: language === "es" ? `${metrics.purchasesCount} compras exitosas` : `${metrics.purchasesCount} successful purchases`,
            icon: "🛒",
            color: "text-secondary",
          },
          {
            title: language === "es" ? "Comisiones Pagadas" : "Commissions Paid",
            value: formatCurrency(metrics.commissionsPaid),
            subtitle: language === "es" ? "Total devengado por la plataforma" : "Total accrued by the platform",
            icon: "🏦",
            color: "text-tertiary",
          },
          {
            title: language === "es" ? "Tasa de Éxito" : "Success Rate",
            value: `${metrics.successRate.toFixed(1)}%`,
            subtitle: language === "es"
              ? `${filteredTransactions.filter((t) => t.status === "COMPLETED").length} de ${metrics.totalCount} transacciones`
              : `${filteredTransactions.filter((t) => t.status === "COMPLETED").length} of ${metrics.totalCount} transactions`,
            icon: "⚡",
            color: "text-info",
          },
        ].map((stat, i) => (
          <Card key={i} hover>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-label-md text-on-surface-muted">{stat.title}</p>
                <span className="text-lg">{stat.icon}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-headline-lg font-bold text-on-surface">{stat.value}</p>
              <p className="mt-1 text-body-sm text-on-surface-muted">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Line Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>
                  {language === "es" ? "Evolución de Flujos Financieros" : "Financial Flows Evolution"}
                </CardTitle>
                <CardDescription>
                  {language === "es"
                    ? "Ingresos por ventas (Verde oscuro) y Gastos por compras (Verde claro)"
                    : "Sales revenue (Dark green) and Purchase expenses (Light green)"}
                </CardDescription>
              </div>
              {/* Legend indicator */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-on-surface-variant">{language === "es" ? "Ventas" : "Sales"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-secondary" />
                  <span className="text-on-surface-variant">{language === "es" ? "Compras" : "Purchases"}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <LineChart data={chartData} />
          </CardContent>
        </Card>

        {/* Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{language === "es" ? "Estado de Operaciones" : "Operations Status"}</CardTitle>
            <CardDescription>
              {language === "es" ? "Distribución de transacciones iniciadas en el período" : "Distribution of transactions initiated in the period"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center pt-2">
            <DonutChart data={statusBreakdown} />
          </CardContent>
        </Card>
      </div>

      {/* Top Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>{language === "es" ? "Operaciones Más Relevantes" : "Most Relevant Operations"}</CardTitle>
          <CardDescription>
            {language === "es"
              ? "Las 5 transacciones de mayor volumen en el período seleccionado"
              : "The 5 highest volume transactions in the selected period"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  <th className="pb-3 text-left text-label-sm text-on-surface-muted">{language === "es" ? "Orden" : "Order"}</th>
                  <th className="pb-3 text-left text-label-sm text-on-surface-muted">{language === "es" ? "Rol" : "Role"}</th>
                  <th className="pb-3 text-left text-label-sm text-on-surface-muted">{language === "es" ? "Monto" : "Amount"}</th>
                  <th className="pb-3 text-left text-label-sm text-on-surface-muted">{language === "es" ? "Estado" : "Status"}</th>
                  <th className="pb-3 text-left text-label-sm text-on-surface-muted">{language === "es" ? "Fecha" : "Date"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {topTransactions.map((t) => {
                  const isSeller = t.sellerId === userId;
                  return (
                    <tr key={t.id} className="hover:bg-surface-low/55 transition-colors">
                      <td className="py-4 text-body-sm font-medium text-on-surface font-mono">{t.orderId}</td>
                      <td className="py-4 text-body-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isSeller
                              ? "bg-primary-container/15 text-primary"
                              : "bg-secondary-container/15 text-secondary"
                          }`}
                        >
                          {isSeller ? (language === "es" ? "Vendedor" : "Seller") : (language === "es" ? "Comprador" : "Buyer")}
                        </span>
                      </td>
                      <td className="py-4 text-body-sm font-semibold text-on-surface">
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="py-4">
                        <StatusBadge status={t.status as any} size="sm" locale={language} />
                      </td>
                      <td className="py-4 text-body-sm text-on-surface-muted">
                        {t.date.toLocaleDateString(language === "es" ? "es-AR" : "en-US", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
                {topTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-on-surface-muted">
                      {language === "es" ? "No hay transacciones registradas en este período." : "No registered transactions in this period."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

