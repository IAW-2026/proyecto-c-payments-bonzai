"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useLanguage } from "@/lib/contexts/LanguageContext";

interface SimulatedUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

interface CartItem {
  id: string;
  sellerId: string;
  amount: number;
  orderRef: string;
}

// Prefilled botanical items for random description generator
const PLANT_DESCRIPTIONS = [
  "Monstera Deliciosa — Grande",
  "Ficus Lyrata — Maceta de Cerámica",
  "Pilea Peperomioides (Planta del dinero china)",
  "Sansevieria Trifasciata (Lengua de suegra)",
  "Sustrato Orgánico Premium 5L",
  "Maceta de Terracota Artesanal Grande",
  "Orquídea Phalaenopsis Blanca",
  "Kit de Herramientas de Jardinería (3 piezas)",
  "Ficus Elastica Ruby (Árbol de goma)",
  "Fertilizante Líquido Bio-estimulante 250ml",
];

const DEFAULT_USERS: SimulatedUser[] = [
  {
    id: "54d72c7a-8229-4261-aa3d-596afd4bbe88",
    name: "Usuario 1",
    email: "usuario1@bonzai.com",
    roles: ["buyer"]
  },
  {
    id: "user_3FbgwHxAYvlQ4KzQWYYkYPrqzIM",
    name: "Usuario 11",
    email: "usuario11@bonzai.com",
    roles: ["seller", "shipping"]
  }
];

// Helper to dynamically translate any Mercado Pago production URL to Sandbox
const getSandboxUrl = (url: string | null): string => {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("mercadopago.com")) {
      parsed.hostname = "sandbox.mercadopago.com.ar";
    }
    return parsed.toString();
  } catch {
    return url
      .replace("www.mercadopago.com.ar", "sandbox.mercadopago.com.ar")
      .replace("www.mercadopago.com", "sandbox.mercadopago.com.ar");
  }
};

// Robust helper to copy to clipboard with execCommand fallback if navigator.clipboard is unavailable
const copyToClipboard = (text: string): boolean => {
  try {
    if (typeof window !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error("Clipboard copy fallback failed", err);
    return false;
  }
};

export default function SimulatorPage() {
  const { language } = useLanguage();
  // Tab navigation and actions state
  const [activeTab, setActiveTab] = useState<"manual" | "batch" | "users">("manual");
  const [releaseLoading, setReleaseLoading] = useState<string | null>(null);

  // ── State ──
  const [users, setUsers] = useState<SimulatedUser[]>([]);
  const [editUsers, setEditUsers] = useState<SimulatedUser[]>([]);
  const [isEditingUsers, setIsEditingUsers] = useState(false);

  // Cart / Checkout state
  const [selectedBuyer, setSelectedBuyer] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("buyer@bonzai.com");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutResponse, setCheckoutResponse] = useState<any>(null);
  const [checkoutPayload, setCheckoutPayload] = useState<any>(null);

  // Webhook simulator state
  const [sessionIdToPay, setSessionIdToPay] = useState("");
  const [mockStatus, setMockStatus] = useState("approved");
  const [mockAmount, setMockAmount] = useState("");
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookResponse, setWebhookResponse] = useState<any>(null);
  const [webhookPayload, setWebhookPayload] = useState<any>(null);
  const [deliveryLoading, setDeliveryLoading] = useState<string | null>(null);

  // Historical Batch Simulator state
  const [selectedBatchBuyers, setSelectedBatchBuyers] = useState<string[]>([]);
  const [selectedBatchSellers, setSelectedBatchSellers] = useState<string[]>([]);
  const [batchStartDate, setBatchStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [batchEndDate, setBatchEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [batchIterations, setBatchIterations] = useState(15);
  const [batchMinAmount, setBatchMinAmount] = useState(15000);
  const [batchMaxAmount, setBatchMaxAmount] = useState(48000);
  const [batchPaymentProb, setBatchPaymentProb] = useState(85);
  const [batchDeliveryProb, setBatchDeliveryProb] = useState(40);
  const [batchDisputeProb, setBatchDisputeProb] = useState(10);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResponse, setBatchResponse] = useState<any>(null);
  const [wipeLoading, setWipeLoading] = useState(false);

  // Database Inspector state
  const [dbInspector, setDbInspector] = useState<{
    wallets: any[];
    transactions: any[];
    checkoutSessions: any[];
    ledgerEntries: any[];
  }>({ wallets: [], transactions: [], checkoutSessions: [], ledgerEntries: [] });
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"tx" | "wallet" | "ledger" | "session">("tx");

  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

  // Helper: Trigger custom toast
  const triggerToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Helper: Generate UUID v4 (Standard for ecommerce order IDs)
  const generateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // Helper: Get random item description
  const getRandomDescription = () => {
    return PLANT_DESCRIPTIONS[Math.floor(Math.random() * PLANT_DESCRIPTIONS.length)];
  };

  // Helper: Add randomized checkout cart item
  const addRandomCartItem = () => {
    const sellers = users.filter((u) => u.roles && u.roles.includes("seller") && u.id !== selectedBuyer);
    const seller = sellers.length > 0 ? sellers[Math.floor(Math.random() * sellers.length)] : null;
    const newItem: CartItem = {
      id: Math.random().toString(36).substring(7),
      sellerId: seller?.id || "",
      amount: Math.floor(Math.random() * 4500) + 500, // $500 to $5000 ARS
      orderRef: generateUUID(),
    };
    setCartItems([...cartItems, newItem]);
  };

  // Helper: Fetch Live DB State for simulated users
  const fetchDbState = useCallback(async () => {
    if (users.length === 0) return;
    setInspectorLoading(true);
    try {
      const userIds = users.map((u) => u.id).join(",");
      const response = await fetch(`/api/simulator/webhook?userIds=${encodeURIComponent(userIds)}`);
      if (!response.ok) throw new Error(language === "es" ? "Error al obtener el estado del simulador." : "Error fetching simulator database state.");
      const data = await response.json();
      setDbInspector(data);
    } catch (err: any) {
      triggerToast(err.message, "error");
    } finally {
      setInspectorLoading(false);
    }
  }, [users, language]);

  // Fetch dynamic users from Clerk
  const syncUsersWithClerk = useCallback(async (showToast = false) => {
    try {
      const response = await fetch("/api/simulator/users");
      if (!response.ok) throw new Error(language === "es" ? "No se pudo obtener la lista de usuarios desde Clerk." : "Failed to retrieve user list from Clerk.");
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem("bonzai_simulator_users", JSON.stringify(data));
        setUsers(data);
        setEditUsers(data);
        if (showToast) {
          triggerToast(
            language === "es"
              ? `Sincronizados ${data.length} usuarios con Clerk.`
              : `Synced ${data.length} users with Clerk.`,
            "success"
          );
        }
      } else {
        if (showToast) {
          triggerToast(
            language === "es"
              ? "La lista de usuarios obtenida está vacía o no tiene roles."
              : "The retrieved user list is empty or has no roles.",
            "info"
          );
        }
      }
    } catch (err: any) {
      if (showToast) {
        triggerToast(
          err.message || (language === "es" ? "Error al sincronizar con Clerk." : "Error syncing with Clerk."),
          "error"
        );
      }
    }
  }, [language]);

  // Load / Save users from localstorage
  useEffect(() => {
    const saved = localStorage.getItem("bonzai_simulator_users");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUsers(parsed);
        setEditUsers(parsed);
      } catch {
        setUsers(DEFAULT_USERS);
        setEditUsers(DEFAULT_USERS);
      }
    } else {
      localStorage.setItem("bonzai_simulator_users", JSON.stringify(DEFAULT_USERS));
      setUsers(DEFAULT_USERS);
      setEditUsers(DEFAULT_USERS);
    }
    // Auto-sync with Clerk on mount silently
    syncUsersWithClerk(false);
  }, [syncUsersWithClerk]);

  // Set default buyer when users are loaded
  // Set default buyer when users are loaded
  useEffect(() => {
    if (users.length > 0 && !selectedBuyer) {
      const defaultBuyer = users.find(u => u.roles && u.roles.includes("buyer"));
      if (defaultBuyer) {
        setSelectedBuyer(defaultBuyer.id);
      }
    }
  }, [users, selectedBuyer]);

  // Autocomplete buyer email when selectedBuyer changes
  useEffect(() => {
    if (selectedBuyer && users.length > 0) {
      const buyerUser = users.find((u) => u.id === selectedBuyer);
      if (buyerUser && buyerUser.email) {
        setBuyerEmail(buyerUser.email);
      }
    }
  }, [selectedBuyer, users]);

  // Sync database state whenever users list changes or mounts
  useEffect(() => {
    if (users.length > 0) {
      fetchDbState();
    }
  }, [users, fetchDbState]);

  // Save modified user configurations
  const saveUserConfig = () => {
    localStorage.setItem("bonzai_simulator_users", JSON.stringify(editUsers));
    setUsers(editUsers);
    setIsEditingUsers(false);
    triggerToast(
      language === "es"
        ? "Configuración de usuarios guardada con éxito."
        : "User configuration saved successfully.",
      "success"
    );
  };

  // Auto-select all buyers and sellers for batch simulation when users load
  useEffect(() => {
    if (users.length > 0 && selectedBatchBuyers.length === 0 && selectedBatchSellers.length === 0) {
      const buyers = users.filter(u => u.roles && u.roles.includes("buyer")).map(u => u.id);
      const sellers = users.filter(u => u.roles && u.roles.includes("seller")).map(u => u.id);
      setSelectedBatchBuyers(buyers);
      setSelectedBatchSellers(sellers);
    }
  }, [users, selectedBatchBuyers.length, selectedBatchSellers.length]);

  // Execute batch historical data generator
  const handleBatchGenerate = async () => {
    if (selectedBatchBuyers.length === 0 || selectedBatchSellers.length === 0) {
      triggerToast(
        language === "es"
          ? "Selecciona al menos un comprador y un vendedor."
          : "Select at least one buyer and one seller.",
        "error"
      );
      return;
    }

    setBatchLoading(true);
    setBatchResponse(null);

    const payload = {
      buyerIds: selectedBatchBuyers,
      sellerIds: selectedBatchSellers,
      startDate: batchStartDate,
      endDate: batchEndDate,
      iterations: Number(batchIterations),
      minAmount: Number(batchMinAmount),
      maxAmount: Number(batchMaxAmount),
      paymentProbability: Number(batchPaymentProb) / 100,
      deliveryProbability: Number(batchDeliveryProb) / 100,
      disputeProbability: Number(batchDisputeProb) / 100,
    };

    try {
      const response = await fetch("/api/simulator/batch-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setBatchResponse(data);

      if (response.ok && data.success) {
        triggerToast(
          language === "es"
            ? `Simulación masiva exitosa: ${data.message}`
            : `Batch simulation successful: ${data.message}`,
          "success"
        );
        fetchDbState();
      } else {
        triggerToast(
          data.message || (language === "es" ? "Error al ejecutar simulación masiva." : "Error running batch simulation."),
          "error"
        );
      }
    } catch (err: any) {
      setBatchResponse({ error: "CONEXION_FALLIDA", message: err.message });
      triggerToast(
        language === "es" ? "Error de conexión." : "Connection error.",
        "error"
      );
    } finally {
      setBatchLoading(false);
    }
  };

  // Wipe all historical financial data
  const handleWipeDatabase = async () => {
    if (!window.confirm(
      language === "es"
        ? "¿Estás seguro de que deseas eliminar TODOS los datos financieros de la base de datos? Esto borrará transacciones, wallets, sesiones y ledger entries. Esta acción no se puede deshacer."
        : "Are you sure you want to delete ALL financial data from the database? This will clear transactions, wallets, sessions, and ledger entries. This action cannot be undone."
    )) {
      return;
    }

    setWipeLoading(true);
    try {
      const response = await fetch("/api/simulator/wipe", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        triggerToast(
          language === "es"
            ? "Base de datos vaciada con éxito."
            : "Database wiped successfully.",
          "success"
        );
        fetchDbState();
      } else {
        triggerToast(
          data.message || (language === "es" ? "Error al vaciar la base de datos." : "Error wiping database."),
          "error"
        );
      }
    } catch (err: any) {
      triggerToast(
        err.message || (language === "es" ? "Error al conectar con el servidor." : "Error connecting to the server."),
        "error"
      );
    } finally {
      setWipeLoading(false);
    }
  };

  // Run checkout simulator
  const handleSimulateCheckout = async () => {
    if (cartItems.length === 0) {
      triggerToast(
        language === "es"
          ? "Agrega al menos una orden al carrito de compras."
          : "Add at least one order to the shopping cart.",
        "error"
      );
      return;
    }

    setCheckoutLoading(true);
    setCheckoutResponse(null);

    const payload = {
      buyerId: selectedBuyer,
      buyerEmail,
      orders: cartItems.map((item) => ({
        sellerId: item.sellerId,
        amount: Number(item.amount),
        orderRef: item.orderRef,
        description: language === "es"
          ? `Orden de pago ${item.orderRef.substring(0, 8)}`
          : `Payment order ${item.orderRef.substring(0, 8)}`,
      })),
    };

    setCheckoutPayload(payload);

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setCheckoutResponse(data);

      if (response.ok && data.transactionId) {
        // Auto fill checkout session ID in webhook form
        setSessionIdToPay(data.transactionId);
        triggerToast(
          language === "es"
            ? "Checkout simulado con éxito (Petición procesada)."
            : "Checkout simulated successfully (Request processed).",
          "success"
        );
        fetchDbState(); // update state
      } else {
        triggerToast(
          data.message || (language === "es" ? "Error al procesar el checkout." : "Error processing checkout."),
          "error"
        );
      }
    } catch (err: any) {
      setCheckoutResponse({ error: "CONEXION_FALLIDA", message: err.message });
      triggerToast(
        language === "es"
          ? "Error de conexión al enviar el checkout."
          : "Connection error sending checkout.",
        "error"
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Run webhook simulator
  const handleSimulateWebhook = async () => {
    if (!sessionIdToPay) {
      triggerToast(
        language === "es"
          ? "Ingresa un ID de CheckoutSession para simular el pago."
          : "Enter a CheckoutSession ID to simulate payment.",
        "error"
      );
      return;
    }

    setWebhookLoading(true);
    setWebhookResponse(null);

    const payload = {
      checkoutSessionId: sessionIdToPay,
      status: mockStatus,
      amount: mockAmount ? Number(mockAmount) : undefined,
    };

    setWebhookPayload(payload);

    try {
      const response = await fetch("/api/simulator/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setWebhookResponse(data);

      if (response.ok && data.success) {
        triggerToast(
          language === "es"
            ? `Webhook de pago procesado exitosamente como: ${mockStatus.toUpperCase()}`
            : `Payment webhook processed successfully as: ${mockStatus.toUpperCase()}`,
          "success"
        );
        // Wait a small moment to let DB write complete, then refresh DB state
        setTimeout(fetchDbState, 800);
      } else {
        triggerToast(
          data.message || (language === "es" ? "La simulación de webhook reportó un error." : "The webhook simulation reported an error."),
          "error"
        );
      }
    } catch (err: any) {
      setWebhookResponse({ error: "CONEXION_FALLIDA", message: err.message });
      triggerToast(
        language === "es"
          ? "Error al invocar el proxy del webhook."
          : "Error invoking the webhook proxy.",
        "error"
      );
    } finally {
      setWebhookLoading(false);
    }
  };

  // Run delivery simulator (marks order as DELIVERED)
  const handleSimulateDelivery = async (orderId: string) => {
    setDeliveryLoading(orderId);
    try {
      const response = await fetch("/api/simulator/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        triggerToast(
          language === "es"
            ? `Orden ${orderId.substring(0, 8)} marcada como ENTREGADA (fondos en escrow).`
            : `Order ${orderId.substring(0, 8)} marked as DELIVERED (funds in escrow).`,
          "success"
        );
        setTimeout(fetchDbState, 800);
      } else {
        triggerToast(
          data.responseReceived?.message || data.message || (language === "es" ? "Error al simular la entrega." : "Error simulating delivery."),
          "error"
        );
      }
    } catch (err: any) {
      triggerToast(
        err.message || (language === "es" ? "Error al conectar con el servidor." : "Error connecting to the server."),
        "error"
      );
    } finally {
      setDeliveryLoading(null);
    }
  };

  // Run release funds simulator (marks order as COMPLETED)
  const handleSimulateReleaseFunds = async (transactionId: string) => {
    setReleaseLoading(transactionId);
    try {
      const response = await fetch("/api/simulator/release-funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        triggerToast(
          language === "es"
            ? "Fondos liberados exitosamente (transacción en COMPLETED)."
            : "Funds released successfully (transaction in COMPLETED).",
          "success"
        );
        setTimeout(fetchDbState, 800);
      } else {
        triggerToast(
          data.responseReceived?.message || data.message || (language === "es" ? "Error al liberar fondos." : "Error releasing funds."),
          "error"
        );
      }
    } catch (err: any) {
      triggerToast(
        err.message || (language === "es" ? "Error al conectar con el servidor." : "Error connecting to the server."),
        "error"
      );
    } finally {
      setReleaseLoading(null);
    }
  };

  const getUserName = (id: string) => {
    const user = users.find((u) => u.id === id);
    if (user) return user.name;
    if (id === "platform") return "Plataforma Bonzai";
    return id.substring(0, 10) + "...";
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-[60] flex items-center gap-3 rounded-lg border px-4 py-3 shadow-ambient-lg transition-all duration-300 animate-slide-in ${
            toastType === "success"
              ? "border-success/20 bg-success-container text-success"
              : toastType === "error"
                ? "border-error/20 bg-error-container text-error"
                : "border-outline-variant bg-surface-lowest text-on-surface"
          }`}
        >
          <span className="text-lg">
            {toastType === "success" ? "✅" : toastType === "error" ? "❌" : "ℹ️"}
          </span>
          <span className="text-body-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-label-md text-secondary mb-2">
            {language === "es" ? "Herramienta de desarrollo" : "Developer Tool"}
          </p>
          <h1 className="text-display-sm text-on-surface">
            {language === "es" ? "Simulador M2M & Webhooks" : "M2M & Webhooks Simulator"}
          </h1>
          <p className="mt-2 text-body-md text-on-surface-muted">
            {language === "es"
              ? "Simula llamadas entrantes desde Seller App y notificaciones salientes de Mercado Pago en tiempo real."
              : "Simulates incoming calls from Seller App and outgoing Mercado Pago notifications in real time."}
          </p>
        </div>
        <Button variant="secondary" onClick={fetchDbState} disabled={inspectorLoading}>
          {inspectorLoading
            ? (language === "es" ? "Refrescando..." : "Refreshing...")
            : (language === "es" ? "🔄 Refrescar base de datos" : "🔄 Refresh Database")}
        </Button>
      </div>

      {/* Sleek Tab Navigation */}
      <div className="flex border-b border-surface-container/60 gap-4 mb-6">
        {[
          { id: "manual", label: language === "es" ? "Simulador Interactivo" : "Interactive Simulator", icon: "⚡" },
          { id: "batch", label: language === "es" ? "Generador por Lotes" : "Batch Generator", icon: "📊" },
          { id: "users", label: language === "es" ? "Usuarios Simulados" : "Simulated Users", icon: "👥" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-3 px-1 text-body-md font-medium border-b-2 transition-all relative ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-muted hover:text-on-surface"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content 1: Interactive / Manual Simulation */}
      {activeTab === "manual" && (
        <div className="space-y-8 animate-fade-in">
          {/* Grid: Checkout & Webhook */}
          <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
            {/* Checkout Simulator Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="ghost-border shadow-ambient-sm">
                <CardHeader className="border-b border-surface-container/50">
                  <CardTitle className="text-headline-md">
                    {language === "es" ? "1. Simular Checkout (POST desde Seller App)" : "1. Simulate Checkout (POST from Seller App)"}
                  </CardTitle>
                  <CardDescription>
                    {language === "es"
                      ? "Simula el flujo de compra. Se enviará una orden de compra agrupada (carrito) al endpoint público del Checkout de Pagos."
                      : "Simulates the purchasing flow. A grouped purchase order (cart) will be sent to the public Payments Checkout endpoint."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Buyer configurations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-label-sm text-secondary mb-1">
                        {language === "es" ? "Comprador (buyerId Clerk)" : "Buyer (Clerk buyerId)"}
                      </label>
                      <select
                        value={selectedBuyer}
                        onChange={(e) => setSelectedBuyer(e.target.value)}
                        className="w-full text-xs rounded border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {users.filter(u => u.roles && u.roles.includes("buyer")).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-label-sm text-secondary mb-1">
                        {language === "es" ? "Email del Comprador" : "Buyer Email"}
                      </label>
                      <input
                        type="email"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        className="w-full text-xs rounded border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Cart Items Area */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-surface-container pb-2">
                      <span className="text-body-sm font-semibold text-on-surface">
                        {language === "es" ? "Carrito / Órdenes a comprar" : "Cart / Orders to purchase"}
                      </span>
                      <Button variant="secondary" size="sm" onClick={addRandomCartItem}>
                        {language === "es" ? "➕ Agregar Orden" : "➕ Add Order"}
                      </Button>
                    </div>

                    {cartItems.length === 0 ? (
                      <div className="text-center py-6 bg-surface-low/40 rounded border border-dashed border-outline-variant/60">
                        <p className="text-body-sm text-on-surface-muted">
                          {language === "es" ? "El carrito está vacío. Agrega órdenes para simular el cobro." : "The cart is empty. Add orders to simulate checkout."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {cartItems.map((item, idx) => (
                          <div key={item.id} className="p-3 bg-surface-low/80 rounded border border-surface-container flex flex-col md:flex-row gap-3 items-start md:items-center">
                            <div className="flex-1 space-y-2 w-full">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                {/* Seller Selection */}
                                <div className="w-full">
                                  <label className="block text-[10px] text-secondary mb-0.5">
                                    {language === "es" ? "Vendedor:" : "Seller:"}
                                  </label>
                                  <select
                                    value={item.sellerId}
                                    onChange={(e) => {
                                      const updated = [...cartItems];
                                      updated[idx].sellerId = e.target.value;
                                      setCartItems(updated);
                                    }}
                                    className="w-full text-[11px] rounded border border-outline-variant bg-surface px-2 py-1.5 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                                  >
                                    <option value="">{language === "es" ? "Seleccionar Vendedor" : "Select Seller"}</option>
                                    {users.filter((u) => u.roles && u.roles.includes("seller") && u.id !== selectedBuyer).map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {u.name} ({u.email})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Amount input */}
                                <div className="w-full">
                                  <label className="block text-[10px] text-secondary mb-0.5">
                                    {language === "es" ? "Monto ($ ARS):" : "Amount ($ ARS):"}
                                  </label>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-on-surface-muted">$</span>
                                    <input
                                      type="number"
                                      value={item.amount}
                                      onChange={(e) => {
                                        const updated = [...cartItems];
                                        updated[idx].amount = Number(e.target.value);
                                        setCartItems(updated);
                                      }}
                                      placeholder={language === "es" ? "Monto" : "Amount"}
                                      className="w-full text-xs bg-surface border border-outline-variant rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                  </div>
                                </div>

                                {/* Order Reference input */}
                                <div className="w-full">
                                  <label className="block text-[10px] text-secondary mb-0.5">
                                    {language === "es" ? "Ref Orden:" : "Order Ref:"}
                                  </label>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={item.orderRef}
                                      onChange={(e) => {
                                        const updated = [...cartItems];
                                        updated[idx].orderRef = e.target.value;
                                        setCartItems(updated);
                                      }}
                                      placeholder={language === "es" ? "UUID o ID Orden" : "UUID or Order ID"}
                                      className="w-full text-[10px] font-mono bg-surface border border-outline-variant rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    <Button
                                      variant="ghost"
                                      className="h-6 px-1.5 text-[9px]"
                                      onClick={() => {
                                        const updated = [...cartItems];
                                        updated[idx].orderRef = generateUUID();
                                        setCartItems(updated);
                                      }}
                                      title={language === "es" ? "Generar nuevo UUID" : "Generate new UUID"}
                                    >
                                      ⚡
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 text-error hover:bg-error/10 self-end md:self-center"
                              onClick={() => setCartItems(cartItems.filter((i) => i.id !== item.id))}
                            >
                              🗑️
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submit checkout buttons */}
                  <div className="flex justify-between items-center border-t border-surface-container pt-4">
                    <span className="text-xs text-on-surface-muted">
                      Total Checkout: <strong className="text-on-surface">${cartItems.reduce((acc, curr) => acc + curr.amount, 0)} ARS</strong>
                    </span>
                    <Button variant="primary" onClick={handleSimulateCheckout} disabled={checkoutLoading}>
                      {checkoutLoading ? (language === "es" ? "Procesando..." : "Processing...") : (language === "es" ? "💳 Enviar Checkout (POST)" : "💳 Send Checkout (POST)")}
                    </Button>
                  </div>

                  {/* Display response details */}
                  {(checkoutPayload || checkoutResponse) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-surface-container/50 text-xs">
                      <div>
                        <span className="text-label-sm text-secondary block mb-1">
                          {language === "es" ? "Payload Enviado" : "Sent Payload"}
                        </span>
                        <pre className="p-3 bg-surface-low rounded border border-outline-variant/60 font-mono text-[10px] overflow-auto max-h-40">
                          {JSON.stringify(checkoutPayload, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <span className="text-label-sm text-secondary block mb-1">
                          {language === "es" ? "Respuesta del Servidor" : "Server Response"}
                        </span>
                        <pre className={`p-3 rounded border font-mono text-[10px] overflow-auto max-h-40 ${
                          checkoutResponse?.error ? "bg-error-container/40 border-error/20 text-error" : "bg-success-container/40 border-success/20 text-on-surface"
                        }`}>
                          {JSON.stringify(checkoutResponse, null, 2)}
                        </pre>
                        {checkoutResponse?.checkoutUrl && (
                          <div className="mt-2 flex gap-2">
                            <a
                              href={getSandboxUrl(checkoutResponse.sandboxUrl || checkoutResponse.checkoutUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block bg-primary text-on-primary text-[11px] font-medium px-3 py-1.5 rounded hover:bg-primary-container text-center flex-1"
                            >
                              {language === "es" ? "Ir a Pagar (Mercado Pago Sandbox)" : "Go to Pay (Mercado Pago Sandbox)"}
                            </a>
                            <Button
                              variant="secondary"
                              className="text-[11px] px-3 py-1.5"
                              onClick={() => {
                                const link = getSandboxUrl(checkoutResponse.sandboxUrl || checkoutResponse.checkoutUrl);
                                const copied = copyToClipboard(link);
                                if (copied) {
                                  triggerToast(
                                    language === "es"
                                      ? "Link de pago (Sandbox) copiado al portapapeles."
                                      : "Payment link (Sandbox) copied to clipboard.",
                                    "success"
                                  );
                                } else {
                                  triggerToast(language === "es" ? "No se pudo copiar el link." : "Failed to copy link.", "error");
                                }
                              }}
                            >
                              {language === "es" ? "📋 Copiar Link" : "📋 Copy Link"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Webhook Form */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="ghost-border shadow-ambient-sm h-full flex flex-col">
                <CardHeader className="border-b border-surface-container/50">
                  <CardTitle className="text-headline-md">
                    {language === "es" ? "2. Simular Webhook (Notificación MP)" : "2. Simulate Webhook (MP Notification)"}
                  </CardTitle>
                  <CardDescription>
                    {language === "es"
                      ? "Simula que Mercado Pago notifica el resultado del pago. Actualiza el estado a HELD/REJECTED y dispara el webhook saliente a la Seller App."
                      : "Simulates Mercado Pago notifying the payment result. Updates the status to HELD/REJECTED and triggers the outgoing webhook to the Seller App."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-label-sm text-secondary mb-1">
                        {language === "es" ? "ID Sesión de Cobro (external_reference)" : "Payment Session ID (external_reference)"}
                      </label>
                      <input
                        type="text"
                        value={sessionIdToPay}
                        onChange={(e) => setSessionIdToPay(e.target.value)}
                        placeholder={language === "es" ? "cuid o id de la sesión..." : "cuid or session ID..."}
                        className="w-full text-xs font-mono rounded border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <p className="text-[10px] text-on-surface-muted mt-1">
                        {language === "es"
                          ? "Copia y pega un ID de la lista de transacciones recientes o crea un checkout arriba."
                          : "Copy and paste an ID from the recent transactions list or create a checkout above."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-label-sm text-secondary mb-1">
                          {language === "es" ? "Estado de Pago" : "Payment Status"}
                        </label>
                        <select
                          value={mockStatus}
                          onChange={(e) => setMockStatus(e.target.value)}
                          className="w-full text-xs rounded border border-outline-variant bg-surface px-2 py-1.5 text-on-surface focus:outline-none"
                        >
                          <option value="approved">{language === "es" ? "Aprobado (approved)" : "Approved (approved)"}</option>
                          <option value="rejected">{language === "es" ? "Rechazado (rejected)" : "Rejected (rejected)"}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-label-sm text-secondary mb-1">
                          {language === "es" ? "Monto (Opcional)" : "Amount (Optional)"}
                        </label>
                        <input
                          type="number"
                          value={mockAmount}
                          onChange={(e) => setMockAmount(e.target.value)}
                          placeholder={language === "es" ? "Monto final..." : "Final amount..."}
                          className="w-full text-xs rounded border border-outline-variant bg-surface px-2 py-1.5 text-on-surface focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-surface-container/60 mt-4 space-y-4">
                    <Button
                      variant={mockStatus === "approved" ? "primary" : "danger"}
                      className="w-full"
                      onClick={handleSimulateWebhook}
                      disabled={webhookLoading}
                    >
                      {webhookLoading
                        ? (language === "es" ? "Simulando pago..." : "Simulating payment...")
                        : `⚡ ${language === "es" ? "Disparar Webhook" : "Trigger Webhook"} (${mockStatus.toUpperCase()})`}
                    </Button>

                    {(webhookPayload || webhookResponse) && (
                      <div className="space-y-3 pt-3 border-t border-surface-container/50 text-[11px]">
                        <div>
                          <span className="text-label-sm text-secondary block mb-1">Bypass Webhook Response</span>
                          <pre className={`p-2.5 rounded font-mono text-[9px] overflow-auto max-h-36 ${
                            webhookResponse?.success ? "bg-success-container/40 border-success/20 text-on-surface" : "bg-error-container/40 border-error/20 text-error"
                          }`}>
                            {JSON.stringify(webhookResponse, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Database inspector tables (Full Width) */}
          <div className="w-full">
            <Card className="ghost-border shadow-ambient-sm h-full flex flex-col">
              <CardHeader className="border-b border-surface-container/50 pb-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-headline-md">
                      {language === "es" ? "Visualizador del Estado en la DB" : "DB State Inspector"}
                    </CardTitle>
                    <CardDescription>
                      {language === "es"
                        ? "Monitorea los registros asociados a tus usuarios simulados en tiempo real."
                        : "Monitor records associated with your simulated users in real time."}
                    </CardDescription>
                  </div>
                  <div className="flex bg-surface-container rounded p-0.5 self-start">
                    {[
                      { id: "tx", label: language === "es" ? "Transacciones" : "Transactions" },
                      { id: "wallet", label: language === "es" ? "Wallets" : "Wallets" },
                      { id: "ledger", label: language === "es" ? "Libro Mayor" : "Ledger" },
                      { id: "session", label: language === "es" ? "Sesiones" : "Sessions" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setInspectorTab(tab.id as any)}
                        className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                          inspectorTab === tab.id
                            ? "bg-surface-lowest shadow-sm text-on-surface"
                            : "text-on-surface-muted hover:text-on-surface"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1 overflow-auto max-h-[500px]">
                {inspectorLoading ? (
                  <div className="text-center py-20 text-on-surface-muted text-sm animate-pulse-soft">
                    {language === "es" ? "Cargando estado actual de la base de datos..." : "Loading current database state..."}
                  </div>
                ) : (
                  <div className="text-xs">
                    {/* TAB 1: TRANSACTIONS */}
                    {inspectorTab === "tx" && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-surface-container pb-2 text-on-surface-muted">
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Orden ID" : "Order ID"}
                              </th>
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Monto" : "Amount"}
                              </th>
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Comprador" : "Buyer"}
                              </th>
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Vendedor" : "Seller"}
                              </th>
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Estado" : "Status"}
                              </th>
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Acción" : "Action"}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {dbInspector.transactions.map((tx) => (
                              <tr key={tx.id} className="border-b border-surface-container/40 hover:bg-surface-low/30">
                                <td className="py-3 font-mono text-[10px] break-all max-w-[120px]">
                                  {tx.orderId}
                                </td>
                                <td className="py-3 font-medium">${Number(tx.amount)} ARS</td>
                                <td className="py-3">{getUserName(tx.buyerId)}</td>
                                <td className="py-3">{getUserName(tx.sellerId)}</td>
                                <td className="py-3">
                                  <StatusBadge status={tx.status} size="sm" locale={language} />
                                </td>
                                <td className="py-3">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-[10px]"
                                      onClick={() => {
                                        setSessionIdToPay(tx.checkoutSessionId);
                                        const copied = copyToClipboard(tx.checkoutSessionId);
                                        if (copied) {
                                          triggerToast(
                                            language === "es"
                                              ? `ID copiado y cargado: ${tx.checkoutSessionId}`
                                              : `ID copied and loaded: ${tx.checkoutSessionId}`,
                                            "success"
                                          );
                                        } else {
                                          triggerToast(
                                            language === "es"
                                              ? `Cargada sesión: ${tx.checkoutSessionId}`
                                              : `Session loaded: ${tx.checkoutSessionId}`,
                                            "info"
                                          );
                                        }
                                      }}
                                      title={language === "es" ? "Copiar ID de sesión al portapapeles y cargar en el formulario" : "Copy session ID to clipboard and load into the form"}
                                    >
                                      {language === "es" ? "Copiar Sesión" : "Copy Session"}
                                    </Button>
                                    {tx.status === "HELD" && (
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        className="h-6 px-2 text-[10px] bg-amber-600/10 text-amber-600 border border-amber-600/25 hover:bg-amber-600 hover:text-white transition-all font-medium flex items-center gap-1"
                                        onClick={() => handleSimulateDelivery(tx.orderId)}
                                        disabled={deliveryLoading === tx.orderId}
                                        title={language === "es" ? "Simular entrega del producto (mueve transacción a DELIVERED)" : "Simulate product delivery (moves transaction to DELIVERED)"}
                                      >
                                        {deliveryLoading === tx.orderId
                                          ? (language === "es" ? "Enviando..." : "Sending...")
                                          : (language === "es" ? "🚚 Entregar" : "🚚 Deliver")}
                                      </Button>
                                    )}
                                    {tx.status === "DELIVERED" && (
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        className="h-6 px-2 text-[10px] bg-emerald-600/10 text-emerald-600 border border-emerald-600/25 hover:bg-emerald-600 hover:text-white transition-all font-medium flex items-center gap-1"
                                        onClick={() => handleSimulateReleaseFunds(tx.id)}
                                        disabled={releaseLoading === tx.id}
                                        title={language === "es" ? "Liberar fondos del escrow al vendedor (mueve transacción a COMPLETED)" : "Release escrow funds to the seller (moves transaction to COMPLETED)"}
                                      >
                                        {releaseLoading === tx.id
                                          ? (language === "es" ? "Liberando..." : "Releasing...")
                                          : (language === "es" ? "🔓 Liberar" : "🔓 Release")}
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {dbInspector.transactions.length === 0 && (
                              <tr>
                                <td colSpan={6} className="text-center py-10 text-on-surface-muted">
                                  {language === "es"
                                    ? "No se encontraron transacciones para los usuarios configurados."
                                    : "No transactions found for the configured users."}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* TAB 2: WALLETS */}
                    {inspectorTab === "wallet" && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-surface-container pb-2 text-on-surface-muted">
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Usuario" : "User"}
                              </th>
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Clerk ID</th>
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Saldo Retenido (HELD)" : "Held Balance (Escrow)"}
                              </th>
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Saldo Disponible" : "Available Balance"}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {dbInspector.wallets.map((wallet) => (
                              <tr key={wallet.id} className="border-b border-surface-container/40 hover:bg-surface-low/30">
                                <td className="py-3 font-semibold">{getUserName(wallet.userId)}</td>
                                <td className="py-3 font-mono text-[10px] break-all max-w-[150px]">{wallet.userId}</td>
                                <td className="py-3 font-medium text-warning">${Number(wallet.heldBalance)} ARS</td>
                                <td className="py-3 font-medium text-success">${Number(wallet.availableBalance)} ARS</td>
                              </tr>
                            ))}
                            {dbInspector.wallets.length === 0 && (
                              <tr>
                                <td colSpan={4} className="text-center py-10 text-on-surface-muted">
                                  {language === "es"
                                    ? "No hay billeteras inicializadas aún. Se crean automáticamente al recibir el primer pago aprobado."
                                    : "No wallets initialized yet. They are created automatically upon receiving the first approved payment."}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* TAB 3: LEDGER ENTRIES */}
                    {inspectorTab === "ledger" && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-surface-container pb-2 text-on-surface-muted">
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Usuario" : "User"}
                              </th>
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Tipo" : "Type"}
                              </th>
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Monto" : "Amount"}
                              </th>
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Descripción" : "Description"}
                              </th>
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Fecha" : "Date"}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {dbInspector.ledgerEntries.map((ledger) => (
                              <tr key={ledger.id} className="border-b border-surface-container/40 hover:bg-surface-low/30">
                                <td className="py-3 font-semibold">{getUserName(ledger.userId)}</td>
                                <td className="py-3">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                                    ledger.type === "CREDIT" ? "bg-success-container text-success" : "bg-error-container text-error"
                                  }`}>
                                    {ledger.type === "CREDIT"
                                      ? (language === "es" ? "CRÉDITO" : "CREDIT")
                                      : (language === "es" ? "DÉBITO" : "DEBIT")}
                                  </span>
                                </td>
                                <td className="py-3 font-medium">${Number(ledger.amount)} ARS</td>
                                <td className="py-3 text-on-surface-muted">{ledger.description}</td>
                                <td className="py-3 text-on-surface-muted text-[10px]">
                                  {new Date(ledger.createdAt).toLocaleTimeString()}
                                </td>
                              </tr>
                            ))}
                            {dbInspector.ledgerEntries.length === 0 && (
                              <tr>
                                <td colSpan={5} className="text-center py-10 text-on-surface-muted">
                                  {language === "es"
                                    ? "No hay registros contables en el libro mayor."
                                    : "No accounting ledger entries found."}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* TAB 4: SESSIONS */}
                    {inspectorTab === "session" && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-surface-container pb-2 text-on-surface-muted">
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Checkout Session ID</th>
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Comprador" : "Buyer"}
                              </th>
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Monto Total" : "Total Amount"}
                              </th>
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Estado" : "Status"}
                              </th>
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Link de Pago" : "Payment Link"}
                              </th>
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Acciones" : "Actions"}
                              </th>
                              <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                {language === "es" ? "Fecha" : "Date"}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {dbInspector.checkoutSessions.map((session) => (
                              <tr key={session.id} className="border-b border-surface-container/40 hover:bg-surface-low/30">
                                <td className="py-3 font-mono text-[10px] break-all max-w-[120px]">{session.id}</td>
                                <td className="py-3">{getUserName(session.buyerId)}</td>
                                <td className="py-3 font-medium">${Number(session.totalAmount)} ARS</td>
                                <td className="py-3">
                                  <StatusBadge status={session.status} size="sm" locale={language} />
                                </td>
                                <td className="py-3">
                                  {session.payments?.[0]?.checkoutUrl ? (
                                    <div className="flex items-center gap-2">
                                      <a
                                        href={getSandboxUrl(session.payments[0].checkoutUrl)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-primary hover:underline font-semibold text-[11px]"
                                        title={language === "es" ? "Pagar en Mercado Pago Sandbox" : "Pay in Mercado Pago Sandbox"}
                                      >
                                        💳 {language === "es" ? "Pagar MP (Sandbox)" : "Pay MP (Sandbox)"}
                                      </a>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0 text-secondary hover:bg-surface-low"
                                        onClick={() => {
                                          const link = getSandboxUrl(session.payments[0].checkoutUrl);
                                          const copied = copyToClipboard(link);
                                          if (copied) {
                                            triggerToast(
                                              language === "es"
                                                ? "Link de pago (Sandbox) copiado al portapapeles."
                                                : "Payment link (Sandbox) copied to clipboard.",
                                              "success"
                                            );
                                          } else {
                                            triggerToast(language === "es" ? "No se pudo copiar el link." : "Failed to copy link.", "error");
                                          }
                                        }}
                                        title={language === "es" ? "Copiar link de pago Sandbox al portapapeles" : "Copy Sandbox payment link to clipboard"}
                                      >
                                        📋
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="text-on-surface-muted italic text-[10px]">
                                      {language === "es" ? "Sin link" : "No link"}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-[10px]"
                                    onClick={() => {
                                      setSessionIdToPay(session.id);
                                      const copied = copyToClipboard(session.id);
                                      if (copied) {
                                        triggerToast(
                                          language === "es"
                                            ? `ID copiado al portapapeles y cargado: ${session.id}`
                                            : `ID copied to clipboard and loaded: ${session.id}`,
                                          "success"
                                        );
                                      } else {
                                        triggerToast(
                                          language === "es"
                                            ? `Cargada sesión: ${session.id}`
                                            : `Session loaded: ${session.id}`,
                                          "info"
                                        );
                                      }
                                    }}
                                    title={language === "es" ? "Copiar ID de sesión al portapapeles y cargar en el formulario" : "Copy session ID to clipboard and load into the form"}
                                  >
                                    {language === "es" ? "Copiar ID" : "Copy ID"}
                                  </Button>
                                </td>
                                <td className="py-3 text-on-surface-muted text-[10px]">
                                  {new Date(session.createdAt).toLocaleDateString()} {new Date(session.createdAt).toLocaleTimeString()}
                                </td>
                              </tr>
                            ))}
                            {dbInspector.checkoutSessions.length === 0 && (
                              <tr>
                                <td colSpan={7} className="text-center py-10 text-on-surface-muted">
                                  {language === "es" ? "No se encontraron sesiones de checkout." : "No checkout sessions found."}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab Content 2: Historical Batch Simulation */}
      {activeTab === "batch" && (
        <div className="w-full animate-fade-in">
          <Card className="ghost-border shadow-ambient-sm">
            <CardHeader className="border-b border-surface-container/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-headline-md">
                    {language === "es" ? "Generador de Datos Históricos (Por Lotes)" : "Historical Batch Data Generator"}
                  </CardTitle>
                  <CardDescription>
                    {language === "es"
                      ? "Crea múltiples transacciones distribuidas en el tiempo para poblar las gráficas de analíticas y simular actividad real."
                      : "Create multiple transactions distributed over time to populate analytics charts and simulate real activity."}
                  </CardDescription>
                </div>
                <Button
                  variant="danger"
                  onClick={handleWipeDatabase}
                  disabled={wipeLoading}
                  className="md:self-center font-medium bg-error/10 hover:bg-error hover:text-white border border-error/25 text-error transition-all"
                >
                  {wipeLoading
                    ? (language === "es" ? "Limpiando..." : "Wiping...")
                    : (language === "es" ? "🧹 Limpiar Datos Financieros" : "🧹 Wipe Financial Data")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Pools configuration */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-label-sm text-secondary">
                        {language === "es" ? "Pool de Compradores" : "Buyer Pool"}
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedBatchBuyers(users.filter(u => u.roles?.includes("buyer")).map(u => u.id))}
                          className="text-[10px] text-primary hover:underline"
                        >
                          {language === "es" ? "Seleccionar todos" : "Select all"}
                        </button>
                        <span className="text-[10px] text-on-surface-muted">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedBatchBuyers([])}
                          className="text-[10px] text-primary hover:underline"
                        >
                          {language === "es" ? "Deseleccionar todos" : "Deselect all"}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2.5 bg-surface-low border border-outline-variant/60 rounded">
                      {users.filter(u => u.roles?.includes("buyer")).map(user => {
                        const isSelected = selectedBatchBuyers.includes(user.id);
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedBatchBuyers(selectedBatchBuyers.filter(id => id !== user.id));
                              } else {
                                setSelectedBatchBuyers([...selectedBatchBuyers, user.id]);
                              }
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                              isSelected
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-surface-lowest border border-outline-variant/60 text-on-surface-muted hover:border-blue-500/50"
                            }`}
                          >
                            {user.name}
                          </button>
                        );
                      })}
                      {users.filter(u => u.roles?.includes("buyer")).length === 0 && (
                        <span className="text-xs text-on-surface-muted italic">
                          {language === "es" ? "No hay compradores disponibles." : "No buyers available."}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-label-sm text-secondary">
                        {language === "es" ? "Pool de Vendedores" : "Seller Pool"}
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedBatchSellers(users.filter(u => u.roles?.includes("seller")).map(u => u.id))}
                          className="text-[10px] text-primary hover:underline"
                        >
                          {language === "es" ? "Seleccionar todos" : "Select all"}
                        </button>
                        <span className="text-[10px] text-on-surface-muted">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedBatchSellers([])}
                          className="text-[10px] text-primary hover:underline"
                        >
                          {language === "es" ? "Deseleccionar todos" : "Deselect all"}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2.5 bg-surface-low border border-outline-variant/60 rounded">
                      {users.filter(u => u.roles?.includes("seller")).map(user => {
                        const isSelected = selectedBatchSellers.includes(user.id);
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedBatchSellers(selectedBatchSellers.filter(id => id !== user.id));
                              } else {
                                setSelectedBatchSellers([...selectedBatchSellers, user.id]);
                              }
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                              isSelected
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-surface-lowest border border-outline-variant/60 text-on-surface-muted hover:border-emerald-500/50"
                            }`}
                          >
                            {user.name}
                          </button>
                        );
                      })}
                      {users.filter(u => u.roles?.includes("seller")).length === 0 && (
                        <span className="text-xs text-on-surface-muted italic">
                          {language === "es" ? "No hay vendedores disponibles." : "No sellers available."}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Parameters and date ranges */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-label-sm text-secondary mb-1">
                        {language === "es" ? "Fecha Inicial" : "Start Date"}
                      </label>
                      <input
                        type="date"
                        value={batchStartDate}
                        onChange={(e) => setBatchStartDate(e.target.value)}
                        className="w-full text-xs rounded border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-label-sm text-secondary mb-1">
                        {language === "es" ? "Fecha Final" : "End Date"}
                      </label>
                      <input
                        type="date"
                        value={batchEndDate}
                        onChange={(e) => setBatchEndDate(e.target.value)}
                        className="w-full text-xs rounded border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-secondary mb-1">
                        {language === "es" ? "Iteraciones" : "Iterations"}
                      </label>
                      <input
                        type="number"
                        value={batchIterations}
                        onChange={(e) => setBatchIterations(Math.max(1, Number(e.target.value)))}
                        className="w-full text-xs rounded border border-outline-variant bg-surface px-2.5 py-1.5 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-secondary mb-1">
                        {language === "es" ? "Monto Mín ($)" : "Min Amount ($)"}
                      </label>
                      <input
                        type="number"
                        value={batchMinAmount}
                        onChange={(e) => setBatchMinAmount(Math.max(0, Number(e.target.value)))}
                        className="w-full text-xs rounded border border-outline-variant bg-surface px-2.5 py-1.5 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-secondary mb-1">
                        {language === "es" ? "Monto Máx ($)" : "Max Amount ($)"}
                      </label>
                      <input
                        type="number"
                        value={batchMaxAmount}
                        onChange={(e) => setBatchMaxAmount(Math.max(0, Number(e.target.value)))}
                        className="w-full text-xs rounded border border-outline-variant bg-surface px-2.5 py-1.5 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] text-secondary mb-1">
                        {language === "es" ? "Prob. Pago" : "Payment Prob."}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={batchPaymentProb}
                          onChange={(e) => setBatchPaymentProb(Math.min(100, Math.max(0, Number(e.target.value))))}
                          className="w-full text-xs rounded border border-outline-variant bg-surface pl-2 pr-6 py-1.5 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="absolute right-2 text-xs text-on-surface-muted">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-secondary mb-1">
                        {language === "es" ? "Prob. Entrega" : "Delivery Prob."}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={batchDeliveryProb}
                          onChange={(e) => setBatchDeliveryProb(Math.min(100, Math.max(0, Number(e.target.value))))}
                          className="w-full text-xs rounded border border-outline-variant bg-surface pl-2 pr-6 py-1.5 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="absolute right-2 text-xs text-on-surface-muted">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-secondary mb-1">
                        {language === "es" ? "Prob. Disputa" : "Dispute Prob."}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={batchDisputeProb}
                          onChange={(e) => setBatchDisputeProb(Math.min(100, Math.max(0, Number(e.target.value))))}
                          className="w-full text-xs rounded border border-outline-variant bg-surface pl-2 pr-6 py-1.5 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="absolute right-2 text-xs text-on-surface-muted">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-surface-container/60 pt-4 gap-4">
                <div className="text-xs text-on-surface-muted">
                  {language === "es" ? (
                    <span>
                      Configuración: <strong>{selectedBatchBuyers.length}</strong> compradores,{" "}
                      <strong>{selectedBatchSellers.length}</strong> vendedores. Iteraciones: <strong>{batchIterations}</strong>.
                    </span>
                  ) : (
                    <span>
                      Setup: <strong>{selectedBatchBuyers.length}</strong> buyers,{" "}
                      <strong>{selectedBatchSellers.length}</strong> sellers. Iterations: <strong>{batchIterations}</strong>.
                    </span>
                  )}
                </div>
                <Button
                  variant="primary"
                  onClick={handleBatchGenerate}
                  disabled={batchLoading}
                  className="w-full sm:w-auto px-6 py-2 shadow-ambient-sm font-medium"
                >
                  {batchLoading
                    ? (language === "es" ? "Generando datos..." : "Generating data...")
                    : (language === "es" ? "🚀 Generar Datos Históricos" : "🚀 Generate Historical Data")}
                </Button>
              </div>

              {batchResponse && (
                <div className="pt-4 border-t border-surface-container/50">
                  <span className="text-label-sm text-secondary block mb-1">
                    {language === "es" ? "Resultado del Generador" : "Generator Result"}
                  </span>
                  <pre className={`p-3 rounded border font-mono text-xs overflow-auto max-h-36 ${
                    batchResponse?.error ? "bg-error-container/40 border-error/20 text-error" : "bg-success-container/40 border-success/20 text-on-surface"
                  }`}>
                    {JSON.stringify(batchResponse, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Content 3: Simulated Users Config */}
      {activeTab === "users" && (
        <div className="w-full animate-fade-in">
          <Card className="ghost-border shadow-ambient-sm">
            <CardHeader className="border-b border-surface-container/50">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-headline-md">
                    {language === "es" ? "Usuarios Simulados" : "Simulated Users"}
                  </CardTitle>
                  <CardDescription>
                    {language === "es" ? "Establece tus 5 IDs reales de Clerk o mocks" : "Set your 5 real Clerk IDs or mocks"}
                  </CardDescription>
                </div>
                {!isEditingUsers && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => syncUsersWithClerk(true)}
                      title={language === "es" ? "Sincronizar con los usuarios generados de Clerk" : "Sync with generated Clerk users"}
                    >
                      {language === "es" ? "🔄 Sincronizar" : "🔄 Sync"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingUsers(true)}>
                      {language === "es" ? "✏️ Editar" : "✏️ Edit"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {isEditingUsers ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {editUsers.map((user, idx) => (
                      <div key={user.id} className="p-4 bg-surface-low rounded border border-outline-variant/40 space-y-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-label-sm text-secondary">
                            {language === "es" ? `Usuario ${idx + 1}` : `User ${idx + 1}`}
                          </span>
                          <span className="text-xs uppercase font-mono px-1.5 py-0.5 rounded bg-surface-container text-on-surface-muted">
                            {user.roles ? user.roles.join(", ") : ""}
                          </span>
                        </div>
                        <div>
                          <label className="block text-[10px] text-secondary mb-0.5">{language === "es" ? "Nombre / Alias:" : "Name / Alias:"}</label>
                          <input
                            type="text"
                            value={user.name}
                            onChange={(e) => {
                              const updated = [...editUsers];
                              updated[idx].name = e.target.value;
                              setEditUsers(updated);
                            }}
                            placeholder={language === "es" ? "Nombre / Alias" : "Name / Alias"}
                            className="w-full text-xs bg-surface-lowest border border-outline-variant rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-secondary mb-0.5">{language === "es" ? "Email de Clerk:" : "Clerk Email:"}</label>
                          <input
                            type="text"
                            value={user.email || ""}
                            onChange={(e) => {
                              const updated = [...editUsers];
                              updated[idx].email = e.target.value;
                              setEditUsers(updated);
                            }}
                            placeholder={language === "es" ? "Email de Clerk" : "Clerk Email"}
                            className="w-full text-xs bg-surface-lowest border border-outline-variant rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-secondary mb-0.5">{language === "es" ? "Roles:" : "Roles:"}</label>
                          <input
                            type="text"
                            value={user.roles ? user.roles.join(", ") : ""}
                            onChange={(e) => {
                              const updated = [...editUsers];
                              updated[idx].roles = e.target.value.split(",").map(r => r.trim()).filter(r => r.length > 0);
                              setEditUsers(updated);
                            }}
                            placeholder={language === "es" ? "Roles (separados por coma)" : "Roles (comma separated)"}
                            className="w-full text-xs bg-surface-lowest border border-outline-variant rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-secondary mb-0.5">Clerk User ID:</label>
                          <input
                            type="text"
                            value={user.id}
                            onChange={(e) => {
                              const updated = [...editUsers];
                              updated[idx].id = e.target.value;
                              setEditUsers(updated);
                            }}
                            placeholder="Clerk User ID"
                            className="w-full text-xs font-mono bg-surface-lowest border border-outline-variant rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end pt-2 border-t border-surface-container/60">
                    <Button variant="ghost" size="sm" onClick={() => { setEditUsers(users); setIsEditingUsers(false); }}>
                      {language === "es" ? "Cancelar" : "Cancel"}
                    </Button>
                    <Button variant="primary" size="sm" onClick={saveUserConfig}>
                      {language === "es" ? "Guardar" : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map((user) => (
                      <div key={user.id} className="flex flex-col p-4 bg-surface-low/60 rounded border border-surface-container transition-all hover:bg-surface-low">
                        <div className="flex items-center justify-between">
                          <span className="text-body-sm font-semibold text-on-surface">{user.name}</span>
                          <div className="flex flex-wrap gap-1">
                            {user.roles && user.roles.map((role) => (
                              <span key={role} className={`text-[9px] font-bold uppercase font-mono px-1.5 py-0.5 rounded ${
                                role === "buyer"
                                  ? "bg-blue-600 text-white"
                                  : role === "seller"
                                    ? "bg-emerald-600 text-white"
                                    : role === "shipping"
                                      ? "bg-amber-600 text-white"
                                      : role === "payments"
                                        ? "bg-purple-600 text-white"
                                        : "bg-gray-600 text-white"
                              }`}>
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="text-xs font-mono text-on-surface-muted break-all mt-2 bg-surface-lowest/50 p-1.5 rounded border border-outline-variant/30">{user.id}</span>
                        {user.email && (
                          <span className="text-[11px] text-secondary mt-2 flex items-center gap-1">📧 {user.email}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-on-surface-muted mt-2 italic text-center border-t border-surface-container/40 pt-4">
                    {language === "es"
                      ? "Los IDs se guardan en tu navegador local (localStorage)."
                      : "IDs are saved in your local browser storage (localStorage)."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
