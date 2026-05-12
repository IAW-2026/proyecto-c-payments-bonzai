import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

// Inicialización del cliente de Mercado Pago en modo sandbox
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || "",
});

export const preferenceClient = new Preference(client);
export const paymentClient = new Payment(client);
export { client as mpClient };
