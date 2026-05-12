/**
 * Mocks para la Seller App API.
 * En la Etapa 2 se usan estos mocks; en la Etapa 3 se reemplazan
 * por llamadas reales al endpoint de Seller App.
 */

const SELLER_APP_URL = process.env.SELLER_APP_URL || "http://localhost:3001";

/**
 * Confirma el pago de una orden en la Seller App.
 * Endpoint real: POST /api/orders/{orderId}/confirm-payment
 */
export async function confirmPaymentToSeller(
  orderId: string,
  transactionId: string,
  paidAt: string
): Promise<{ success: boolean }> {
  // ── MOCK (Etapa 2) ──
  // En producción, descomentar el bloque real y eliminar el mock.
  console.log(
    `[MOCK] Confirming payment to Seller App: orderId=${orderId}, txn=${transactionId}`
  );
  return { success: true };

  // ── REAL (Etapa 3) ──
  // const response = await fetch(
  //   `${SELLER_APP_URL}/api/orders/${orderId}/confirm-payment`,
  //   {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       transactionId,
  //       status: "PAYMENT_HELD",
  //       paidAt,
  //     }),
  //   }
  // );
  // if (!response.ok) {
  //   throw new Error(`Seller App error: ${response.status}`);
  // }
  // return response.json();
}
