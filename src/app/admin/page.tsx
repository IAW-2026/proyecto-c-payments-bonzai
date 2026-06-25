import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { cookies } from "next/headers";
import { getTranslations } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

function formatCurrency(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", { style: "currency", currency: "ARS" }).format(amount);
}

export default async function AdminDashboardPage() {
  await requireRole(["payments_admin", "admin"]);

  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value || "en";
  const t = getTranslations(locale);

  // 1. Total transactions count (excluding pending drafts)
  const totalTransactions = await db.transaction.count({
    where: { status: { not: "PENDING" } },
  });

  // 2. Sum of transaction amounts (total volume of non-pending transactions)
  const volumeResult = await db.transaction.aggregate({
    where: { status: { not: "PENDING" } },
    _sum: { amount: true },
  });
  const totalVolume = Number(volumeResult._sum.amount || 0);

  // 3. Active disputes count (where resolvedAt is null)
  const activeDisputes = await db.dispute.count({
    where: { resolvedAt: null },
  });

  // 4. Sum of commission amounts (total commission generated from non-pending transactions)
  const commissionResult = await db.transaction.aggregate({
    where: { status: { not: "PENDING" } },
    _sum: { commissionAmount: true },
  });
  const totalCommission = Number(commissionResult._sum.commissionAmount || 0);

  // 5. Pending payments
  const pendingPayments = await db.transaction.count({
    where: { status: "PENDING" },
  });

  // 6. Completed today (completed transactions since midnight today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completedToday = await db.transaction.count({
    where: {
      status: "COMPLETED",
      updatedAt: { gte: today },
    },
  });

  // 7. Recent disputes
  const disputes = await db.dispute.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { transaction: true },
  });

  const reasonLabels: Record<string, string> = {
    ITEM_NOT_RECEIVED: locale === "es" ? "Producto no recibido" : "Item not received",
    ITEM_DAMAGED: locale === "es" ? "Producto dañado" : "Item damaged",
    ITEM_NOT_AS_DESCRIBED: locale === "es" ? "No coincide con la descripción" : "Not as described",
    WRONG_ITEM: locale === "es" ? "Producto incorrecto" : "Wrong item",
    OTHER: locale === "es" ? "Otro" : "Other",
  };

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Editorial Header */}
      <div>
        <p className="text-label-md text-secondary mb-2">{t("admin.label")}</p>
        <h1 className="text-display-sm text-on-surface">{t("admin.title")}</h1>
        <p className="mt-2 text-body-md text-on-surface-muted">
          {t("admin.desc")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: t("admin.stats.totalTx"), value: totalTransactions.toString(), icon: "📊" },
          { title: t("admin.stats.totalVolume"), value: formatCurrency(totalVolume, locale), icon: "💰" },
          { title: t("admin.stats.activeDisputes"), value: activeDisputes.toString(), icon: "⚖️" },
          { title: t("admin.stats.commissions"), value: formatCurrency(totalCommission, locale), icon: "🏦" },
          { title: t("admin.stats.pendingPayments"), value: pendingPayments.toString(), icon: "⏳" },
          { title: t("admin.stats.completedToday"), value: completedToday.toString(), icon: "✅" },
        ].map((stat) => (
          <Card key={stat.title} hover>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-label-md text-on-surface-muted">{stat.title}</p>
                <span className="text-xl">{stat.icon}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-headline-lg text-on-surface">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Disputes */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-xl">⚖️</span>
            <h2 className="text-headline-md text-on-surface">{t("admin.sections.recentDisputes")}</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {disputes.map((dispute, i) => (
              <div
                key={dispute.id}
                className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg px-4 py-4 transition-colors duration-200 hover:bg-surface-low ${
                  i % 2 === 0 ? "bg-transparent" : "bg-surface-low/40"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-medium text-on-surface">
                    {dispute.transaction?.orderId || (locale === "es" ? "Orden desconocida" : "Unknown order")}
                  </p>
                  <p className="text-label-sm text-on-surface-muted truncate">
                    {reasonLabels[dispute.reason] || dispute.reason.replace(/_/g, " ")} · {dispute.id}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <p className="text-body-sm font-semibold text-on-surface">
                    {formatCurrency(Number(dispute.transaction?.amount || 0), locale)}
                  </p>
                  <StatusBadge status={dispute.transaction?.status || "DISPUTED"} size="sm" locale={locale} />
                </div>
              </div>
            ))}
          </div>
          {disputes.length === 0 && (
            <p className="py-8 text-center text-body-sm text-on-surface-muted">
              {t("admin.emptyDisputes")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

