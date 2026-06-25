"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { BarChart, DonutChart } from "@/components/ui/charts";
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

interface DisputeData {
  id: string;
  transactionId: string;
  reason: string;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  amount: number;
  status: string;
}

interface WalletData {
  id: string;
  userId: string;
  availableBalance: number;
  heldBalance: number;
}

interface AdminAnalyticsClientProps {
  transactions: TransactionData[];
  disputes: DisputeData[];
  wallets: WalletData[];
}

type DateRange = "7d" | "30d" | "90d" | "all";

export default function AdminAnalyticsClient({
  transactions,
  disputes,
  wallets,
}: AdminAnalyticsClientProps) {
  const [range, setRange] = useState<DateRange>("30d");
  const { language } = useLanguage();

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat(language === "es" ? "es-AR" : "en-US", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Parse dates once
  const txParsed = useMemo(() => {
    return transactions.map((t) => ({ ...t, date: new Date(t.createdAt) }));
  }, [transactions]);

  const dsParsed = useMemo(() => {
    return disputes.map((d) => ({ ...d, date: new Date(d.createdAt) }));
  }, [disputes]);

  // Determine starting date based on range
  const filterStartDate = useMemo(() => {
    const now = new Date();
    const start = new Date();
    if (range === "7d") {
      start.setDate(now.getDate() - 7);
    } else if (range === "30d") {
      start.setDate(now.getDate() - 30);
    } else if (range === "90d") {
      start.setDate(now.getDate() - 90);
    } else {
      return null; // All time
    }
    start.setHours(0, 0, 0, 0);
    return start;
  }, [range]);

  // Filter transactions in range
  const filteredTxs = useMemo(() => {
    if (!filterStartDate) return txParsed;
    return txParsed.filter((t) => t.date >= filterStartDate);
  }, [txParsed, filterStartDate]);

  // Filter disputes in range
  const filteredDs = useMemo(() => {
    if (!filterStartDate) return dsParsed;
    return dsParsed.filter((d) => d.date >= filterStartDate);
  }, [dsParsed, filterStartDate]);

  // Global Wallet stats (static snapshot as it represents current platform state)
  const walletStats = useMemo(() => {
    let availableTotal = 0;
    let heldTotal = 0;
    wallets.forEach((w) => {
      availableTotal += w.availableBalance;
      heldTotal += w.heldBalance;
    });
    return {
      availableTotal,
      heldTotal,
      grandTotal: availableTotal + heldTotal,
    };
  }, [wallets]);

  // Platform performance KPIs in range
  const metrics = useMemo(() => {
    let gmv = 0;
    let commissions = 0;
    let completedCount = 0;
    let totalCount = filteredTxs.length;

    filteredTxs.forEach((t) => {
      if (t.status !== "PENDING" && t.status !== "REFUNDED") {
        gmv += t.amount;
        commissions += t.commissionAmount;
        completedCount++;
      }
    });

    const disputeRate = totalCount > 0 ? (filteredDs.length / totalCount) * 100 : 0;

    return {
      gmv,
      commissions,
      completedCount,
      totalCount,
      disputeRate,
      disputeCount: filteredDs.length,
    };
  }, [filteredTxs, filteredDs]);

  // Leaderboards: Top Sellers and Buyers
  const leaderboards = useMemo(() => {
    const sellers: { [key: string]: number } = {};
    const buyers: { [key: string]: number } = {};

    filteredTxs.forEach((t) => {
      if (t.status === "PENDING" || t.status === "REFUNDED") return;
      sellers[t.sellerId] = (sellers[t.sellerId] || 0) + t.amount;
      buyers[t.buyerId] = (buyers[t.buyerId] || 0) + t.amount;
    });

    const topSellers = Object.entries(sellers)
      .map(([userId, volume]) => ({ userId, volume }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);

    const topBuyers = Object.entries(buyers)
      .map(([userId, volume]) => ({ userId, volume }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);

    return { topSellers, topBuyers };
  }, [filteredTxs]);

  // Chronological Grouping for Bar Chart (GMV and Commission)
  const chartData = useMemo(() => {
    const grouped: { [key: string]: { gmv: number; commission: number } } = {};
    const labels: string[] = [];
    const localeStr = language === "es" ? "es-AR" : "en-US";

    const now = new Date();

    if (range === "7d" || range === "30d") {
      const days = range === "7d" ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const key = d.toLocaleDateString(localeStr, { day: "2-digit", month: "short" });
        labels.push(key);
        grouped[key] = { gmv: 0, commission: 0 };
      }

      filteredTxs.forEach((t) => {
        if (t.status === "PENDING" || t.status === "REFUNDED") return;
        const key = t.date.toLocaleDateString(localeStr, { day: "2-digit", month: "short" });
        if (grouped[key]) {
          grouped[key].gmv += t.amount;
          grouped[key].commission += t.commissionAmount;
        }
      });
    } else if (range === "90d") {
      // Group by Week (approx 13 weeks)
      for (let i = 12; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i * 7);
        const key = language === "es" ? `Sem -${i}` : `Wk -${i}`;
        labels.push(key);
        grouped[key] = { gmv: 0, commission: 0 };
      }

      filteredTxs.forEach((t) => {
        if (t.status === "PENDING" || t.status === "REFUNDED") return;
        const diffDays = Math.floor((now.getTime() - t.date.getTime()) / (1000 * 60 * 60 * 24));
        const weekIdx = 12 - Math.floor(diffDays / 7);
        if (weekIdx >= 0 && weekIdx <= 12) {
          const key = labels[weekIdx];
          grouped[key].gmv += t.amount;
          grouped[key].commission += t.commissionAmount;
        }
      });
    } else {
      // Group by Month
      let startMonth = 0;
      let startYear = now.getFullYear();

      if (txParsed.length > 0) {
        const firstTx = txParsed[0].date;
        startMonth = firstTx.getMonth();
        startYear = firstTx.getFullYear();
      }

      const totalMonths = (now.getFullYear() - startYear) * 12 + (now.getMonth() - startMonth) + 1;
      const monthLimit = Math.max(1, Math.min(12, totalMonths));

      for (let i = monthLimit - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i, 1);
        const key = d.toLocaleDateString(localeStr, { month: "short", year: "2-digit" });
        labels.push(key);
        grouped[key] = { gmv: 0, commission: 0 };
      }

      filteredTxs.forEach((t) => {
        if (t.status === "PENDING" || t.status === "REFUNDED") return;
        const key = t.date.toLocaleDateString(localeStr, { month: "short", year: "2-digit" });
        if (grouped[key]) {
          grouped[key].gmv += t.amount;
          grouped[key].commission += t.commissionAmount;
        }
      });
    }

    return labels.map((label) => ({
      label,
      value: grouped[label].gmv,
      secondaryValue: grouped[label].commission,
    }));
  }, [filteredTxs, range, txParsed, language]);

  // Disputes breakdown for Donut Chart
  const disputeBreakdown = useMemo(() => {
    let openCount = 0;
    let favorBuyerCount = 0;
    let favorSellerCount = 0;

    filteredDs.forEach((d) => {
      if (!d.resolvedAt) {
        openCount++;
      } else if (d.resolution === "FAVOR_BUYER") {
        favorBuyerCount++;
      } else if (d.resolution === "FAVOR_SELLER") {
        favorSellerCount++;
      }
    });

    const dataset = [
      {
        label: language === "es" ? "En Trámite (Abiertas)" : "In Progress (Open)",
        value: openCount,
        color: "var(--warning)",
      },
      {
        label: language === "es" ? "Favor Comprador" : "Favor Buyer",
        value: favorBuyerCount,
        color: "var(--primary)",
      },
      {
        label: language === "es" ? "Favor Vendedor" : "Favor Seller",
        value: favorSellerCount,
        color: "var(--secondary)",
      },
    ];

    return dataset.filter((d) => d.value > 0);
  }, [filteredDs, language]);

  // Dispute Reasons breakdown (Top reasons list)
  const disputeReasons = useMemo(() => {
    const counts: { [key: string]: number } = {};
    filteredDs.forEach((d) => {
      counts[d.reason] = (counts[d.reason] || 0) + 1;
    });

    const mapping: { [key: string]: string } = {
      ITEM_NOT_RECEIVED: language === "es" ? "Producto no recibido" : "Item not received",
      ITEM_DAMAGED: language === "es" ? "Producto dañado" : "Item damaged",
      ITEM_NOT_AS_DESCRIBED: language === "es" ? "Diferente a la descripción" : "Not as described",
      WRONG_ITEM: language === "es" ? "Producto equivocado" : "Wrong item",
      QUALITY_ISSUE: language === "es" ? "Problema de calidad" : "Quality issue",
      OTHER: language === "es" ? "Otros motivos" : "Other reasons",
    };

    return Object.entries(counts)
      .map(([reason, count]) => ({
        label: mapping[reason] || reason.replace(/_/g, " "),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredDs, language]);

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Editorial Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-label-md text-secondary mb-2">
            {language === "es" ? "Vista general de plataforma" : "Platform Overview"}
          </p>
          <h1 className="text-display-sm text-on-surface">
            {language === "es" ? "Analíticas de Administrador" : "Admin Analytics"}
          </h1>
          <p className="mt-2 text-body-md text-on-surface-muted">
            {language === "es"
              ? "Métricas de transacciones, comisiones de plataforma, disputas y balances de billeteras."
              : "Transaction metrics, platform commissions, disputes, and wallet balances."}
          </p>
        </div>

        {/* Date Filters — Glassmorphic Switch */}
        <div className="flex bg-surface-mid/60 border border-outline-variant/10 p-1 rounded-full w-fit shrink-0">
          {[
            { id: "7d", label: language === "es" ? "7 Días" : "7 Days" },
            { id: "30d", label: language === "es" ? "30 Días" : "30 Days" },
            { id: "90d", label: language === "es" ? "90 Días" : "90 Days" },
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            title: language === "es" ? "Volumen Total (GMV)" : "Total Volume (GMV)",
            value: formatCurrency(metrics.gmv),
            subtitle: language === "es" ? `${metrics.completedCount} pagos completados` : `${metrics.completedCount} completed payments`,
            icon: "💳",
          },
          {
            title: language === "es" ? "Ingresos Netos (Comisiones)" : "Net Income (Commissions)",
            value: formatCurrency(metrics.commissions),
            subtitle: language === "es" ? "Comisiones devengadas" : "Accrued commissions",
            icon: "🏦",
          },
          {
            title: language === "es" ? "Tasa de Disputas" : "Dispute Rate",
            value: `${metrics.disputeRate.toFixed(1)}%`,
            subtitle: language === "es" ? `${metrics.disputeCount} disputas registradas` : `${metrics.disputeCount} disputes registered`,
            icon: "⚖️",
          },
          {
            title: language === "es" ? "Fondos en Custodia" : "Funds in Escrow",
            value: formatCurrency(walletStats.heldTotal),
            subtitle: language === "es" ? "Saldo retenido total" : "Total held balance",
            icon: "🔒",
          },
          {
            title: language === "es" ? "Fondos Disponibles" : "Available Funds",
            value: formatCurrency(walletStats.availableTotal),
            subtitle: language === "es" ? "Saldo listo para retiro" : "Balance ready for withdrawal",
            icon: "✅",
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
              <p className="text-headline-md font-bold text-on-surface truncate">{stat.value}</p>
              <p className="mt-1 text-body-sm text-on-surface-muted truncate">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bar Chart (GMV and Net commissions) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>
                  {language === "es" ? "Volumen de Negocios y Comisiones" : "Business Volume and Commissions"}
                </CardTitle>
                <CardDescription>
                  {language === "es"
                    ? "Comparativa del GMV procesado y las comisiones recaudadas por la plataforma"
                    : "Comparison of processed GMV and commissions collected by the platform"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary-container" />
                  <span className="text-on-surface-variant">
                    {language === "es" ? "GMV de Transacciones" : "Transaction GMV"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
                  <span className="text-on-surface-variant">
                    {language === "es" ? "Comisiones Plataforma" : "Platform Commissions"}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <BarChart data={chartData} />
          </CardContent>
        </Card>

        {/* Dispute Status donut chart */}
        <Card>
          <CardHeader>
            <CardTitle>{language === "es" ? "Resolución de Disputas" : "Disputes Resolution"}</CardTitle>
            <CardDescription>
              {language === "es" ? "Distribución de disputas iniciadas en este período" : "Distribution of disputes initiated in this period"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center pt-2">
            {disputeBreakdown.length > 0 ? (
              <DonutChart data={disputeBreakdown} />
            ) : (
              <div className="flex h-56 items-center justify-center text-center">
                <p className="text-body-sm text-on-surface-muted">
                  {language === "es" ? "No se registraron disputas en el período." : "No disputes registered in the period."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leaderboards and Dispute Reasons */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Top Sellers */}
        <Card>
          <CardHeader>
            <CardTitle>{language === "es" ? "Top Vendedores" : "Top Sellers"}</CardTitle>
            <CardDescription>
              {language === "es" ? "Usuarios con mayor volumen de ventas completadas" : "Users with the highest volume of completed sales"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaderboards.topSellers.map((seller, i) => (
                <div key={seller.userId} className="flex items-center justify-between text-body-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-container/20 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="font-mono text-on-surface-variant max-w-[120px] truncate">
                      {seller.userId}
                    </span>
                  </div>
                  <span className="font-semibold text-on-surface">
                    {formatCurrency(seller.volume)}
                  </span>
                </div>
              ))}
              {leaderboards.topSellers.length === 0 && (
                <p className="py-4 text-center text-on-surface-muted text-body-sm">
                  {language === "es" ? "No hay datos de ventas." : "No sales data."}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Buyers */}
        <Card>
          <CardHeader>
            <CardTitle>{language === "es" ? "Top Compradores" : "Top Buyers"}</CardTitle>
            <CardDescription>
              {language === "es" ? "Usuarios con mayor volumen de compras completadas" : "Users with the highest volume of completed purchases"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaderboards.topBuyers.map((buyer, i) => (
                <div key={buyer.userId} className="flex items-center justify-between text-body-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary-container/20 text-xs font-bold text-secondary">
                      {i + 1}
                    </span>
                    <span className="font-mono text-on-surface-variant max-w-[120px] truncate">
                      {buyer.userId}
                    </span>
                  </div>
                  <span className="font-semibold text-on-surface">
                    {formatCurrency(buyer.volume)}
                  </span>
                </div>
              ))}
              {leaderboards.topBuyers.length === 0 && (
                <p className="py-4 text-center text-on-surface-muted text-body-sm">
                  {language === "es" ? "No hay datos de compras." : "No purchases data."}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dispute Reasons List */}
        <Card>
          <CardHeader>
            <CardTitle>{language === "es" ? "Motivos de Disputa" : "Dispute Reasons"}</CardTitle>
            <CardDescription>
              {language === "es" ? "Razones más comunes declaradas por compradores" : "Most common reasons reported by buyers"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {disputeReasons.map((reason, i) => (
                <div key={i} className="flex items-center justify-between text-body-sm">
                  <span className="text-on-surface-variant font-medium">{reason.label}</span>
                  <span className="inline-flex items-center rounded-full bg-error-container/15 px-2 py-0.5 text-xs font-semibold text-error">
                    {reason.count} {reason.count === 1 ? (language === "es" ? "caso" : "case") : (language === "es" ? "casos" : "cases")}
                  </span>
                </div>
              ))}
              {disputeReasons.length === 0 && (
                <div className="flex h-28 items-center justify-center text-center">
                  <p className="text-body-sm text-on-surface-muted">
                    {language === "es" ? "No hay disputas registradas." : "No disputes registered."}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
