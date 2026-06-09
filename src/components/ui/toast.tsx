"use client";

import { clsx } from "clsx";
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";

/* ─── Toast Types ─────────────────────────────────────── */

export interface ToastData {
  id: string;
  message: string;
  variant: "success" | "error" | "info";
  duration?: number;
}

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const variantStyles = {
  success: {
    bg: "bg-success-container",
    text: "text-success",
    icon: "✓",
  },
  error: {
    bg: "bg-error-container",
    text: "text-error",
    icon: "✕",
  },
  info: {
    bg: "bg-info/8",
    text: "text-info",
    icon: "ℹ",
  },
};

/* ─── Single Toast ────────────────────────────────────── */

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [exiting, setExiting] = useState(false);
  const style = variantStyles[toast.variant];

  useEffect(() => {
    const duration = toast.duration ?? 4000;
    const exitTimer = setTimeout(() => setExiting(true), duration - 300);
    const removeTimer = setTimeout(() => onDismiss(toast.id), duration);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast, onDismiss]);

  return (
    <div
      className={clsx(
        "flex items-center gap-3 rounded-lg px-4 py-3 shadow-ambient-sm transition-all duration-300",
        style.bg,
        exiting ? "toast-exit" : "toast-enter"
      )}
    >
      <span
        className={clsx(
          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white",
          toast.variant === "success" && "bg-success",
          toast.variant === "error" && "bg-error",
          toast.variant === "info" && "bg-info"
        )}
      >
        {style.icon}
      </span>
      <p className={clsx("text-body-sm font-medium", style.text)}>
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        className={clsx(
          "ml-auto text-sm opacity-60 transition-opacity hover:opacity-100",
          style.text
        )}
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  );
}

/* ─── Toast Container ─────────────────────────────────── */

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-24 right-6 z-[60] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}

/* ─── useToast Hook ───────────────────────────────────── */

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback(
    (message: string, variant: ToastData["variant"] = "success", duration?: number) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, variant, duration }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}
