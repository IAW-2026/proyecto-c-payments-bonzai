import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateM2MAuth } from "@/lib/m2m-auth";
import { toNumber } from "@/lib/query-helpers";

/**
 * GET /api/control-plane/audit/integrity
 * Chequeo de integridad contable del libro mayor.
 * Valida matemáticamente que Σ(DEBIT) = Σ(CREDIT) en todo el sistema.
 * Si hay descalces, retorna la lista de transacciones inconsistentes.
 *
 * Consumido por: Control Plane
 */
export async function GET(request: NextRequest) {
  const authError = validateM2MAuth(request, "control-plane");
  if (authError) return authError;

  try {
    // 1. Totales globales
    const [totalDebits, totalCredits] = await Promise.all([
      db.ledgerEntry.aggregate({
        where: { type: "DEBIT" },
        _sum: { amount: true },
        _count: true,
      }),
      db.ledgerEntry.aggregate({
        where: { type: "CREDIT" },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const globalDebitSum = toNumber(totalDebits._sum.amount);
    const globalCreditSum = toNumber(totalCredits._sum.amount);
    const globalDifference = Math.abs(globalDebitSum - globalCreditSum);
    const globalBalanced =
      globalDifference < 0.01; // Tolerancia de 1 centavo por redondeo

    // 2. Verificar integridad por transacción individual
    // Agrupar sumas de DEBIT y CREDIT por transactionId
    const debitsByTransaction = await db.ledgerEntry.groupBy({
      by: ["transactionId"],
      where: { type: "DEBIT" },
      _sum: { amount: true },
    });

    const creditsByTransaction = await db.ledgerEntry.groupBy({
      by: ["transactionId"],
      where: { type: "CREDIT" },
      _sum: { amount: true },
    });

    // Crear mapa de débitos por transacción
    const debitMap = new Map<string, number>();
    for (const d of debitsByTransaction) {
      debitMap.set(d.transactionId, toNumber(d._sum.amount));
    }

    // Crear mapa de créditos por transacción
    const creditMap = new Map<string, number>();
    for (const c of creditsByTransaction) {
      creditMap.set(c.transactionId, toNumber(c._sum.amount));
    }

    // Encontrar todas las transactionIds únicas
    const allTransactionIds = new Set([
      ...debitMap.keys(),
      ...creditMap.keys(),
    ]);

    // Encontrar inconsistencias
    const inconsistencies: Array<{
      transactionId: string;
      debitTotal: number;
      creditTotal: number;
      difference: number;
    }> = [];

    for (const txnId of allTransactionIds) {
      const debitTotal = debitMap.get(txnId) || 0;
      const creditTotal = creditMap.get(txnId) || 0;
      const diff = Math.abs(debitTotal - creditTotal);

      // Los ajustes manuales (amount=0) no cuentan como inconsistencia
      if (diff >= 0.01 && debitTotal > 0 && creditTotal > 0) {
        inconsistencies.push({
          transactionId: txnId,
          debitTotal,
          creditTotal,
          difference: Math.round(diff * 100) / 100,
        });
      }
    }

    // 3. Transacciones sin ledger entries (huérfanas)
    const totalTransactions = await db.transaction.count();
    const transactionsWithLedger = allTransactionIds.size;
    const orphanedTransactions = await db.transaction.count({
      where: {
        status: { in: ["HELD", "DELIVERED", "COMPLETED", "REFUNDED"] },
        ledgerEntries: { none: {} },
      },
    });

    // 4. Integridad de wallets: saldo debe coincidir con ledger
    const wallets = await db.wallet.findMany();
    const walletInconsistencies: Array<{
      userId: string;
      walletTotal: number;
      ledgerNet: number;
      difference: number;
    }> = [];

    for (const wallet of wallets) {
      const userId = wallet.userId;
      const walletTotal =
        toNumber(wallet.availableBalance) + toNumber(wallet.heldBalance);

      // Calcular neto del ledger para este usuario, excluyendo débitos de pagos externos (Mercado Pago)
      const userEntries = await db.ledgerEntry.findMany({
        where: { userId },
        include: {
          transaction: true,
        },
      });

      let ledgerNet = 0;
      for (const entry of userEntries) {
        const amount = toNumber(entry.amount);
        if (entry.type === "CREDIT") {
          ledgerNet += amount;
        } else if (entry.type === "DEBIT") {
          // Excluir débitos al comprador que representan pagos externos (Mercado Pago)
          const isExternalPaymentDebit =
            entry.transaction.buyerId === userId &&
            entry.transaction.id !== "system-adjustments-txn";
          if (!isExternalPaymentDebit) {
            ledgerNet -= amount;
          }
        }
      }

      const diff = Math.abs(walletTotal - ledgerNet);

      if (diff >= 0.01) {
        const roundedWalletTotal = Math.round(walletTotal * 100) / 100;
        walletInconsistencies.push({
          userId,
          balance: roundedWalletTotal,
          walletBalance: roundedWalletTotal,
          totalBalance: roundedWalletTotal,
          walletTotal: roundedWalletTotal,
          ledgerNet: Math.round(ledgerNet * 100) / 100,
          difference: Math.round(diff * 100) / 100,
        });
      }
    }

    const isIntegrous =
      globalBalanced &&
      inconsistencies.length === 0 &&
      orphanedTransactions === 0 &&
      walletInconsistencies.length === 0;

    return NextResponse.json({
      status: isIntegrous ? "PASS" : "FAIL",
      timestamp: new Date().toISOString(),
      global: {
        totalDebits: Math.round(globalDebitSum * 100) / 100,
        totalCredits: Math.round(globalCreditSum * 100) / 100,
        difference: Math.round(globalDifference * 100) / 100,
        balanced: globalBalanced,
        debitEntryCount: totalDebits._count,
        creditEntryCount: totalCredits._count,
      },
      transactionIntegrity: {
        totalChecked: allTransactionIds.size,
        inconsistentCount: inconsistencies.length,
        inconsistencies: inconsistencies.slice(0, 50), // Limitar a 50
      },
      orphanedTransactions: {
        count: orphanedTransactions,
        message:
          orphanedTransactions > 0
            ? `${orphanedTransactions} transacción(es) procesada(s) sin entradas en el libro mayor.`
            : "Todas las transacciones procesadas tienen entradas en el libro mayor.",
      },
      walletIntegrity: {
        totalChecked: wallets.length,
        inconsistentCount: walletInconsistencies.length,
        inconsistencies: walletInconsistencies,
      },
    });
  } catch (error) {
    console.error("[control-plane/audit/integrity] Error:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "Error al ejecutar chequeo de integridad.",
      },
      { status: 500 }
    );
  }
}
