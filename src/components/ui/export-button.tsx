"use client";

import { clsx } from "clsx";
import { useState, useRef, useEffect } from "react";
import { ToastContainer, useToast } from "./toast";

import { useLanguage } from "@/lib/contexts/LanguageContext";

interface ExportButtonProps {
  entity: string;
  filters?: Record<string, string>;
  hasData?: boolean;
  className?: string;
}

function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M4 16h12"
      />
    </svg>
  );
}

export function ExportButton({ entity, filters = {}, hasData = true, className }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toasts, addToast, dismissToast } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleExport(format: "csv" | "xlsx") {
    if (!hasData) {
      addToast(
        language === "es"
          ? "No hay contenido o registros para exportar en este momento."
          : "No content or records to export at this time.",
        "error"
      );
      setOpen(false);
      return;
    }

    setLoading(true);
    setOpen(false);

    try {
      const params = new URLSearchParams({ entity, format, ...filters });
      const res = await fetch(`/api/admin/export?${params}`);

      if (!res.ok) throw new Error("Error al exportar");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
      a.download = filenameMatch?.[1] ?? `${entity}.${format}`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      addToast(
        language === "es"
          ? "Hubo un error al generar el archivo de exportación."
          : "There was an error generating the export file.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={dropdownRef} className={clsx("relative", className)}>
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className={clsx(
          "inline-flex items-center gap-2 rounded bg-surface-mid px-4 py-2 text-body-sm font-medium text-on-surface-variant transition-all duration-200",
          "hover:bg-surface-high hover:text-on-surface",
          "disabled:opacity-50 disabled:pointer-events-none"
        )}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <DownloadIcon className="h-4 w-4" />
        )}
        {language === "es" ? "Exportar" : "Export"}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg bg-surface-lowest shadow-ambient py-1 animate-fade-in">
          <button
            onClick={() => handleExport("csv")}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-low hover:text-on-surface"
          >
            <span className="text-base">📄</span>
            {language === "es" ? "Exportar como CSV" : "Export as CSV"}
          </button>
          <button
            onClick={() => handleExport("xlsx")}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-low hover:text-on-surface"
          >
            <span className="text-base">📊</span>
            {language === "es" ? "Exportar como Excel" : "Export as Excel"}
          </button>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
