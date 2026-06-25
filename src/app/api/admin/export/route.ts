import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";
import { auth } from "@clerk/nextjs/server";
import { getRoles } from "@/lib/auth";

/**
 * GET /api/admin/export?entity=transactions&format=csv|xlsx
 * Exporta datos del sistema en CSV o Excel.
 * Entidades soportadas: transactions, ledger, disputes, wallets
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entity = searchParams.get("entity");
    const format = searchParams.get("format") || "csv";
    const status = searchParams.get("status") || undefined;

    if (!entity) {
      return NextResponse.json(
        { error: "MISSING_ENTITY", message: "El parámetro 'entity' es requerido." },
        { status: 400 }
      );
    }

    // Obtener sesión de Clerk para validar permisos
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Debe iniciar sesión para exportar datos." },
        { status: 401 }
      );
    }

    const scope = searchParams.get("scope");
    const roles = await getRoles();
    const isAdmin = (roles.includes("payments_admin") || roles.includes("admin")) && scope !== "user";

    let rows: Record<string, unknown>[] = [];
    let headers: string[] = [];
    let filename = entity;

    switch (entity) {
      case "transactions": {
        const userFilter = isAdmin
          ? {}
          : {
              OR: [
                { buyerId: userId },
                { sellerId: userId },
              ],
            };
        const statusFilter = status ? { status: status as any } : {};
        const where = {
          ...statusFilter,
          ...userFilter,
        };

        const data = await db.transaction.findMany({
          where,
          orderBy: { createdAt: "desc" },
        });
        headers = ["ID", "Orden", "Comprador", "Vendedor", "Monto", "Comisión", "Neto", "Estado", "Moneda", "Fecha"];
        rows = data.map((t: any) => ({
          "ID": t.id,
          "Orden": t.orderId,
          "Comprador": t.buyerId,
          "Vendedor": t.sellerId,
          "Monto": Number(t.amount),
          "Comisión": Number(t.commissionAmount),
          "Neto": Number(t.netAmount),
          "Estado": t.status,
          "Moneda": t.currency,
          "Fecha": t.createdAt.toISOString(),
        }));
        filename = "transacciones";
        break;
      }

      case "ledger": {
        const where = isAdmin ? {} : { userId };
        const data = await db.ledgerEntry.findMany({
          where,
          orderBy: { createdAt: "desc" },
        });
        headers = ["ID", "Usuario", "Transacción", "Tipo", "Monto", "Descripción", "Fecha"];
        rows = data.map((e: any) => ({
          "ID": e.id,
          "Usuario": e.userId,
          "Transacción": e.transactionId,
          "Tipo": e.type === "CREDIT" ? "CRÉDITO" : "DÉBITO",
          "Monto": Number(e.amount),
          "Descripción": e.description || "",
          "Fecha": e.createdAt.toISOString(),
        }));
        filename = "libro_mayor";
        break;
      }

      case "disputes": {
        const userFilter = isAdmin
          ? {}
          : {
              transaction: {
                OR: [
                  { buyerId: userId },
                  { sellerId: userId },
                ],
              },
            };
        const data = await db.dispute.findMany({
          where: userFilter,
          include: { transaction: true },
          orderBy: { createdAt: "desc" },
        });
        const reasonLabels: Record<string, string> = {
          ITEM_NOT_RECEIVED: "Producto no recibido",
          ITEM_DAMAGED: "Producto dañado",
          ITEM_NOT_AS_DESCRIBED: "No coincide con la descripción",
          WRONG_ITEM: "Producto incorrecto",
          OTHER: "Otro",
        };
        headers = ["ID", "Transacción", "Orden", "Motivo", "Descripción", "Resolución", "Monto Reembolso", "Fecha", "Resuelta"];
        rows = data.map((d: any) => ({
          "ID": d.id,
          "Transacción": d.transactionId,
          "Orden": d.transaction?.orderId || "",
          "Motivo": reasonLabels[d.reason] || d.reason,
          "Descripción": d.description || "",
          "Resolución": d.resolution || "Pendiente",
          "Monto Reembolso": d.refundAmount ? Number(d.refundAmount) : "",
          "Fecha": d.createdAt.toISOString(),
          "Resuelta": d.resolvedAt ? d.resolvedAt.toISOString() : "No",
        }));
        filename = "disputas";
        break;
      }

      case "wallets": {
        const where = isAdmin ? {} : { userId };
        const data = await db.wallet.findMany({
          where,
          orderBy: { updatedAt: "desc" },
        });
        headers = ["ID", "Usuario", "Saldo Disponible", "Saldo Retenido", "Total", "Última Actualización"];
        rows = data.map((w: any) => ({
          "ID": w.id,
          "Usuario": w.userId,
          "Saldo Disponible": Number(w.availableBalance),
          "Saldo Retenido": Number(w.heldBalance),
          "Total": Number(w.availableBalance) + Number(w.heldBalance),
          "Última Actualización": w.updatedAt.toISOString(),
        }));
        filename = "billeteras";
        break;
      }

      default:
        return NextResponse.json(
          { error: "INVALID_ENTITY", message: `Entidad '${entity}' no soportada.` },
          { status: 400 }
        );
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const fullFilename = `${filename}_${dateStr}`;

    if (format === "xlsx") {
      // Generate Excel
      const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

      // Auto-width columns
      const colWidths = headers.map((h) => {
        const maxLen = Math.max(
          h.length,
          ...rows.map((r) => String(r[h] ?? "").length)
        );
        return { wch: Math.min(maxLen + 2, 40) };
      });
      ws["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, filename);
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fullFilename}.xlsx"`,
        },
      });
    }

    // Generate CSV (semicolon-separated for regional Excel compatibility)
    const csvLines: string[] = [];
    csvLines.push(headers.join(";"));
    for (const row of rows) {
      const line = headers.map((h) => {
        const val = String(row[h] ?? "");
        // Escape values containing semicolons or quotes
        if (val.includes(";") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvLines.push(line.join(";"));
    }
    const csvContent = "\uFEFF" + csvLines.join("\r\n"); // BOM for Excel UTF-8

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fullFilename}.csv"`,
      },
    });
  } catch (error) {
    console.error("[admin/export] Error:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error al exportar datos." },
      { status: 500 }
    );
  }
}
