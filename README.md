# Bonzai Payments App 🌱💳

**Aplicación de gestión de pagos del marketplace botánico Bonzai.**

Procesamiento de cobros, billeteras virtuales, disputas y reembolsos para el marketplace de plantas, plantines, semillas e insumos.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS 4 |
| ORM | Prisma |
| Base de datos | PostgreSQL |
| Auth | Clerk |
| Pagos | Mercado Pago (sandbox) |
| Deploy | Vercel |

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env.local
# Completar los valores en .env.local

# 3. Generar Prisma Client
npx prisma generate

# 4. Ejecutar migraciones (requiere DATABASE_URL configurado)
npx prisma migrate dev

# 5. (Opcional) Cargar datos de prueba
npx prisma db seed

# 6. Iniciar servidor de desarrollo
npm run dev
```

## Usuarios de prueba

| Tipo | Acceso |
|------|--------|
| Comprador | Registrarse con rol `buyer` |
| Vendedor | Registrarse con rol `seller` |
| Admin | Usuario con rol `payments_admin` en Clerk |

## Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/payments/checkout` | Iniciar pago (Buyer App) |
| `POST` | `/api/payments/{txnId}/delivered` | Notificar entrega (Shipping App) |
| `GET` | `/api/payments/{txnId}/status` | Estado del pago (Seller App) |
| `POST` | `/api/webhooks/mercadopago` | Webhook Mercado Pago |
| `GET` | `/api/payments/balance` | Consultar saldo (Seller/Admin) |
| `POST` | `/api/payments/{orderId}/dispute` | Abrir disputa (Buyer App) |
| `POST` | `/api/payments/{orderId}/resolve-dispute` | Resolver disputa (Admin) |
| `POST` | `/api/payments/{orderId}/refund` | Reembolso (Admin) |
| `GET` | `/api/admin/ledger` | Libro mayor (Admin) |

## Integrante

**Santino Trevisan** — Payments App  
Proyecto IAW 2026 — Comisión Bonzai
