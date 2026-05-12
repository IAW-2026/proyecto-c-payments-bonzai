import { z } from "zod/v4";

// ─── Checkout ────────────────────────────────────────────

export const checkoutSchema = z.object({
  sellerId: z.string().min(1, "sellerId es obligatorio"),
  amount: z.number().positive("El monto debe ser mayor a cero"),
  orderRef: z.string().min(1, "orderRef es obligatorio"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ─── Delivered ───────────────────────────────────────────

export const deliveredSchema = z.object({
  trackingId: z.string().min(1, "trackingId es obligatorio"),
  status: z.literal("DELIVERED"),
  deliveredAt: z.string().datetime("Formato de fecha inválido"),
});

export type DeliveredInput = z.infer<typeof deliveredSchema>;

// ─── Dispute ─────────────────────────────────────────────

export const disputeSchema = z.object({
  reason: z.enum([
    "ITEM_NOT_RECEIVED",
    "ITEM_DAMAGED",
    "ITEM_NOT_AS_DESCRIBED",
    "WRONG_ITEM",
    "OTHER",
  ]),
  description: z.string().optional(),
});

export type DisputeInput = z.infer<typeof disputeSchema>;

// ─── Resolve Dispute ─────────────────────────────────────

export const resolveDisputeSchema = z.object({
  resolution: z.enum(["FAVOR_BUYER", "FAVOR_SELLER", "PARTIAL_REFUND"]),
  refundAmount: z.number().positive().optional(),
  resolutionNotes: z.string().optional(),
});

export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;

// ─── Refund ──────────────────────────────────────────────

export const refundSchema = z.object({
  reason: z.string().optional(),
});

export type RefundInput = z.infer<typeof refundSchema>;
