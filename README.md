# Payments App — Bonzai

### 1. Link al deploy de producción
👉 **[https://proyecto-c-payments-bonzai.vercel.app](https://proyecto-c-payments-bonzai.vercel.app)**

### 2. Usuarios para realizar pruebas

Para evaluar las funcionalidades dependientes de roles, utilizar las siguientes credenciales (Autenticadas vía Clerk):

- **Usuario Administrador** (Acceso total al Panel Admin y Dashboard)
  - Email: `payments_admin+clerk_test@iaw.com`
  - Contraseña: `iawuser#`

- **Usuario Comprador/Vendedor Común** (Acceso únicamente a su Dashboard)
  - Email: `payments+clerk_test@iaw.com`
  - Contraseña: `iawuser#`

### 3. Instrucciones para utilizar/evaluar la aplicación

1. **Dashboard de Usuario (`/dashboard`)**: Ingresar con la cuenta de usuario común para visualizar el estado de la billetera (saldo disponible y retenido) y explorar el historial de transacciones en la interfaz de tarjetas responsivas.
2. **Panel de Administración (`/admin`)**: Ingresar con la cuenta administradora para auditar el sistema completo.
3. **Buscador y Filtros**: Dentro del panel admin, dirigirse a `/admin/transactions` y probar la barra de búsqueda combinada con el selector de estados (ambos actúan en tiempo real sobre la base de datos).
4. **Resolución de Disputas**: En `/admin/disputes`, probar los botones de resolución ("Favor Comprador" o "Favor Vendedor"). Observar cómo la decisión impacta contablemente generando las entradas correspondientes en el Libro Mayor (`/admin/ledger`) y ajustando los saldos en las Billeteras (`/admin/wallets`).
5. **Responsive Design**: Se recomienda inspeccionar la plataforma simulando la vista desde un dispositivo móvil para evaluar el menú lateral dinámico (Drawer) y la transformación de las tablas de datos en Responsive Cards.

### 4. Breve descripción del proyecto

Esta aplicación actúa como el motor financiero (Gateway y Ledger) de **Bonzai**, un marketplace de e-commerce. Su responsabilidad principal es orquestar los pagos, retener los fondos para garantizar compras seguras, y mantener un registro contable inmutable de cada centavo que entra, sale o se transfiere dentro de la plataforma.

A nivel de integración, expone webhooks y endpoints M2M (Machine to Machine) para comunicarse de forma segura con la aplicación de Vendedores (Seller App) y la logística (Shipping App). Esto permite que, a partir de una única sesión de pago (Checkout Session), se manejen carritos multi-vendedor de forma atómica: el dinero se fracciona, las comisiones de la plataforma se extraen automáticamente, y los fondos se liberan recién cuando se confirma la entrega.

El sistema también incorpora un módulo integral de auditoría y disputas. Proveemos un Panel de Administración que permite al equipo de soporte visualizar el Libro Mayor de movimientos, revisar el estado de las billeteras de los usuarios, e intervenir en los conflictos de las compras, asegurando la transparencia financiera de todo el ecosistema Bonzai.

### 5. Notas o comentarios para la corrección

Nos gustaría destacar ciertas decisiones de diseño arquitectónico y de UI/UX que elevan la calidad técnica del proyecto:

- **Arquitectura M2M y Webhooks Securizados**: La aplicación no opera de forma aislada. Expone endpoints con autenticación de *headers* personalizados (ej. `x-shipping-key`) para recibir gatillos desde la app de Envíos y notificar asíncronamente a la app de Vendedores, emulando un ecosistema real de microservicios.
- **Doble Entrada Contable (Ledger Inmutable)**: Las billeteras de los usuarios no se actualizan sobreescribiendo valores a ciegas. Implementamos un Libro Mayor (*Double-Entry Ledger*) donde cada movimiento financiero genera entradas inmutables de `CREDIT` y `DEBIT`, garantizando un sistema 100% auditable.
- **Carrito Multi-Vendedor Atómico**: Desarrollamos una relación padre-hijo (`CheckoutSession` -> `Transaction`) que nos permite pagar un carrito con productos de múltiples vendedores usando un solo link de Mercado Pago, pero fraccionando el dinero internamente para manejar comisiones y disputas individuales sin afectar el resto de la orden.
- **UI Responsiva Híbrida**: El panel de administración utiliza patrones de diseño avanzado. En lugar de forzar tablas HTML en móviles, detectamos el tamaño de pantalla y transformamos dinámicamente las grillas en *Responsive Cards* apiladas y menús tipo *Drawer*, ofreciendo una experiencia similar a una app nativa.
- **Limitación Conocida**: El modelo de datos contempla un período de protección de fondos (los fondos permanecen en estado `HELD` durante X días tras la entrega). Si bien el estado y las fechas están implementadas, el *Cron Job* automático que ejecuta la liberación de los fondos hacia el estado `COMPLETED` queda como trabajo futuro para una próxima iteración.

## Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/payments/checkout` | Iniciar pago (Buyer App) |
| `POST` | `/api/payments/{checkoutSessionId}/delivered` | Notificar entrega (Shipping App) |
| `GET` | `/api/payments/{transactionId}/status` | Estado del pago (Seller App) |
| `POST` | `/api/webhooks/mercadopago` | Webhook Mercado Pago |
| `GET` | `/api/payments/balance` | Consultar saldo (Seller/Admin) |
| `POST` | `/api/payments/{orderId}/dispute` | Abrir disputa (Buyer App) |
| `POST` | `/api/payments/{orderId}/resolve-dispute` | Resolver disputa (Admin) |
| `POST` | `/api/payments/{orderId}/refund` | Reembolso (Admin) |
| `GET` | `/api/admin/ledger` | Libro mayor (Admin) |

---

**Santino Trevisan** — Payments App  
Proyecto IAW 2026 — Comisión Bonzai
