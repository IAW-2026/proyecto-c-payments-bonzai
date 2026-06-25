import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { cookies } from "next/headers";
import { getTranslations } from "@/lib/i18n";

function formatCurrency(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
}

function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function DashboardPage() {
  const userId = await requireAuth();

  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value || "en";
  const t = getTranslations(locale);

  // 1. Billetera (Saldo disponible y retenido)
  const wallet = await db.wallet.upsert({
    where: { userId },
    create: {
      userId,
      availableBalance: 0,
      heldBalance: 0,
    },
    update: {},
  });

  const available = Number(wallet.availableBalance);
  const held = Number(wallet.heldBalance);

  // 2. Cantidad de transacciones del usuario (como comprador o vendedor)
  const totalTransactions = await db.transaction.count({
    where: {
      OR: [
        { buyerId: userId },
        { sellerId: userId },
      ],
    },
  });

  // 3. Volumen total operado (suma de transacciones completadas)
  const volumeResult = await db.transaction.aggregate({
    where: {
      OR: [
        { buyerId: userId },
        { sellerId: userId },
      ],
      status: "COMPLETED",
    },
    _sum: {
      amount: true,
    },
  });
  const totalVolume = Number(volumeResult._sum.amount || 0);

  // 4. Transacciones recientes
  const recentTransactions = await db.transaction.findMany({
    where: {
      OR: [
        { buyerId: userId },
        { sellerId: userId },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Editorial Header */}
      <div>
        <p className="text-label-md text-secondary mb-2">{t("dashboard.label")}</p>
        <h1 className="text-display-sm text-on-surface">{t("dashboard.title")}</h1>
        <p className="mt-2 text-body-md text-on-surface-muted">
          {t("dashboard.desc")}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: t("dashboard.stats.transactions"),
            value: totalTransactions.toString(),
            icon: "📊",
            description: t("dashboard.stats.transactionsDesc"),
          },
          {
            title: t("dashboard.stats.volume"),
            value: formatCurrency(totalVolume, locale),
            icon: "💰",
            description: t("dashboard.stats.volumeDesc"),
          },
          {
            title: t("dashboard.stats.held"),
            value: formatCurrency(held, locale),
            icon: "🔒",
            description: t("dashboard.stats.heldDesc"),
          },
          {
            title: t("dashboard.stats.available"),
            value: formatCurrency(available, locale),
            icon: "✅",
            description: t("dashboard.stats.availableDesc"),
          },
        ].map((stat) => (
          <Card key={stat.title} hover>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-label-md text-on-surface-muted">
                  {stat.title}
                </p>
                <span className="text-xl">{stat.icon}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-headline-lg text-on-surface">{stat.value}</p>
              <p className="mt-1 text-body-sm text-on-surface-muted">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">{t("dashboard.sections.recent")}</h2>
            <Link
              href="/dashboard/transactions"
              className="text-body-sm text-secondary font-medium transition-colors duration-300 hover:text-primary"
            >
              {t("dashboard.buttons.viewAll")} →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">
                    ID
                  </th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">
                    {t("dashboard.table.headers.order")}
                  </th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">
                    {t("dashboard.table.headers.amount")}
                  </th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">
                    {t("dashboard.table.headers.status")}
                  </th>
                  <th className="pb-4 text-left text-label-sm text-on-surface-muted">
                    {t("dashboard.table.headers.date")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((txn, i) => (
                  <tr
                    key={txn.id}
                    className={`transition-colors duration-200 hover:bg-surface-low ${
                      i % 2 === 0 ? "bg-transparent" : "bg-surface-low/50"
                    }`}
                  >
                    <td className="py-4 text-body-sm font-mono text-on-surface-muted">
                      {txn.id}
                    </td>
                    <td className="py-4 text-body-sm text-on-surface">
                      {txn.orderId}
                    </td>
                    <td className="py-4 text-body-sm font-medium text-on-surface">
                      {formatCurrency(Number(txn.amount), locale)}
                    </td>
                    <td className="py-4">
                      <StatusBadge status={txn.status} size="sm" locale={locale} />
                    </td>
                    <td className="py-4 text-body-sm text-on-surface-muted">
                      {formatDate(txn.createdAt, locale)}
                    </td>
                  </tr>
                ))}
                {recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-on-surface-muted">
                      {t("dashboard.empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {recentTransactions.length === 0 && (
            <p className="py-8 text-center text-body-sm text-on-surface-muted">
              {t("dashboard.empty")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

