"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

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
      if (!response.ok) throw new Error("Error fetching simulator database state.");
      const data = await response.json();
      setDbInspector(data);
    } catch (err: any) {
      triggerToast(err.message, "error");
    } finally {
      setInspectorLoading(false);
    }
  }, [users]);

  // Fetch dynamic users from Clerk
  const syncUsersWithClerk = useCallback(async (showToast = false) => {
    try {
      const response = await fetch("/api/simulator/users");
      if (!response.ok) throw new Error("No se pudo obtener la lista de usuarios desde Clerk.");
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem("bonzai_simulator_users", JSON.stringify(data));
        setUsers(data);
        setEditUsers(data);
        if (showToast) {
          triggerToast(`Sincronizados ${data.length} usuarios con Clerk.`, "success");
        }
      } else {
        if (showToast) {
          triggerToast("La lista de usuarios obtenida está vacía o no tiene roles.", "info");
        }
      }
    } catch (err: any) {
      if (showToast) {
        triggerToast(err.message || "Error al sincronizar con Clerk.", "error");
      }
    }
  }, []);

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
    triggerToast("Configuración de usuarios guardada con éxito.", "success");
  };

  // Run checkout simulator
  const handleSimulateCheckout = async () => {
    if (cartItems.length === 0) {
      triggerToast("Agrega al menos una orden al carrito de compras.", "error");
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
        description: `Orden de pago ${item.orderRef.substring(0, 8)}`,
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
        triggerToast("Checkout simulado con éxito (Petición procesada).", "success");
        fetchDbState(); // update state
      } else {
        triggerToast(data.message || "Error al procesar el checkout.", "error");
      }
    } catch (err: any) {
      setCheckoutResponse({ error: "CONEXION_FALLIDA", message: err.message });
      triggerToast("Error de conexión al enviar el checkout.", "error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Run webhook simulator
  const handleSimulateWebhook = async () => {
    if (!sessionIdToPay) {
      triggerToast("Ingresa un ID de CheckoutSession para simular el pago.", "error");
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
        triggerToast(`Webhook de pago procesado exitosamente como: ${mockStatus.toUpperCase()}`, "success");
        // Wait a small moment to let DB write complete, then refresh DB state
        setTimeout(fetchDbState, 800);
      } else {
        triggerToast(data.message || "La simulación de webhook reportó un error.", "error");
      }
    } catch (err: any) {
      setWebhookResponse({ error: "CONEXION_FALLIDA", message: err.message });
      triggerToast("Error al invocar el proxy del webhook.", "error");
    } finally {
      setWebhookLoading(false);
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
          <p className="text-label-md text-secondary mb-2">Herramienta de desarrollo</p>
          <h1 className="text-display-sm text-on-surface">Simulador M2M & Webhooks</h1>
          <p className="mt-2 text-body-md text-on-surface-muted">
            Simula llamadas entrantes desde Seller App y notificaciones salientes de Mercado Pago en tiempo real.
          </p>
        </div>
        <Button variant="secondary" onClick={fetchDbState} disabled={inspectorLoading}>
          {inspectorLoading ? "Refrescando..." : "🔄 Refrescar base de datos"}
        </Button>
      </div>

      {/* Grid: Configurations and Logs */}
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        {/* Users Config Box */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="ghost-border shadow-ambient-sm">
            <CardHeader className="border-b border-surface-container/50">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-headline-md">Usuarios Simulados</CardTitle>
                  <CardDescription>Establece tus 5 IDs reales de Clerk o mocks</CardDescription>
                </div>
                {!isEditingUsers && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => syncUsersWithClerk(true)}
                      title="Sincronizar con los usuarios generados de Clerk"
                    >
                      🔄 Sincronizar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingUsers(true)}>
                      ✏️ Editar
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {isEditingUsers ? (
                <div className="space-y-4">
                  {editUsers.map((user, idx) => (
                    <div key={user.id} className="p-3 bg-surface-low rounded border border-outline-variant/40 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-label-sm text-secondary">Usuario {idx + 1}</span>
                        <span className="text-xs uppercase font-mono px-1.5 py-0.5 rounded bg-surface-container text-on-surface-muted">
                          {user.roles ? user.roles.join(", ") : ""}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={user.name}
                        onChange={(e) => {
                          const updated = [...editUsers];
                          updated[idx].name = e.target.value;
                          setEditUsers(updated);
                        }}
                        placeholder="Nombre / Alias"
                        className="w-full text-xs bg-surface-lowest border border-outline-variant rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="text"
                        value={user.email || ""}
                        onChange={(e) => {
                          const updated = [...editUsers];
                          updated[idx].email = e.target.value;
                          setEditUsers(updated);
                        }}
                        placeholder="Email de Clerk"
                        className="w-full text-xs bg-surface-lowest border border-outline-variant rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="text"
                        value={user.roles ? user.roles.join(", ") : ""}
                        onChange={(e) => {
                          const updated = [...editUsers];
                          updated[idx].roles = e.target.value.split(",").map(r => r.trim()).filter(r => r.length > 0);
                          setEditUsers(updated);
                        }}
                        placeholder="Roles (separados por coma)"
                        className="w-full text-xs bg-surface-lowest border border-outline-variant rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
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
                  ))}
                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="ghost" size="sm" onClick={() => { setEditUsers(users); setIsEditingUsers(false); }}>
                      Cancelar
                    </Button>
                    <Button variant="primary" size="sm" onClick={saveUserConfig}>
                      Guardar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="flex flex-col p-2.5 bg-surface-low/60 rounded border border-surface-container transition-all hover:bg-surface-low">
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
                      <span className="text-xs font-mono text-on-surface-muted break-all mt-1">{user.id}</span>
                      {user.email && (
                        <span className="text-[11px] text-secondary mt-0.5">{user.email}</span>
                      )}
                    </div>
                  ))}
                  <p className="text-[11px] text-on-surface-muted mt-2 italic text-center">
                    Los IDs se guardan en tu navegador local (localStorage).
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Checkout Simulator Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="ghost-border shadow-ambient-sm">
            <CardHeader className="border-b border-surface-container/50">
              <CardTitle className="text-headline-md">1. Simular Checkout (POST desde Seller App)</CardTitle>
              <CardDescription>
                Simula el flujo de compra. Se enviará una orden de compra agrupada (carrito) al endpoint público del Checkout de Pagos.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Buyer configurations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-label-sm text-secondary mb-1">Comprador (buyerId Clerk)</label>
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
                  <label className="block text-label-sm text-secondary mb-1">Email del Comprador</label>
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
                  <span className="text-body-sm font-semibold text-on-surface">Carrito / Órdenes a comprar</span>
                  <Button variant="secondary" size="sm" onClick={addRandomCartItem}>
                    ➕ Agregar Orden
                  </Button>
                </div>

                {cartItems.length === 0 ? (
                  <div className="text-center py-6 bg-surface-low/40 rounded border border-dashed border-outline-variant/60">
                    <p className="text-body-sm text-on-surface-muted">El carrito está vacío. Agrega órdenes para simular el cobro.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {cartItems.map((item, idx) => (
                      <div key={item.id} className="p-3 bg-surface-low/80 rounded border border-surface-container flex flex-col md:flex-row gap-3 items-start md:items-center">
                        <div className="flex-1 space-y-2 w-full">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                            {/* Seller Selection */}
                            <div className="w-full">
                              <label className="block text-[10px] text-secondary mb-0.5">Vendedor:</label>
                              <select
                                value={item.sellerId}
                                onChange={(e) => {
                                  const updated = [...cartItems];
                                  updated[idx].sellerId = e.target.value;
                                  setCartItems(updated);
                                }}
                                className="w-full text-[11px] rounded border border-outline-variant bg-surface px-2 py-1.5 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                <option value="">Seleccionar Vendedor</option>
                                {users.filter((u) => u.roles && u.roles.includes("seller") && u.id !== selectedBuyer).map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name} ({u.email})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Amount input */}
                            <div className="w-full">
                              <label className="block text-[10px] text-secondary mb-0.5">Monto ($ ARS):</label>
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
                                  placeholder="Monto"
                                  className="w-full text-xs bg-surface border border-outline-variant rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </div>

                            {/* Order Reference input */}
                            <div className="w-full">
                              <label className="block text-[10px] text-secondary mb-0.5">Ref Orden:</label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={item.orderRef}
                                  onChange={(e) => {
                                    const updated = [...cartItems];
                                    updated[idx].orderRef = e.target.value;
                                    setCartItems(updated);
                                  }}
                                  placeholder="UUID o ID Orden"
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
                                  title="Generar nuevo UUID"
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
                  {checkoutLoading ? "Procesando..." : "💳 Enviar Checkout (POST)"}
                </Button>
              </div>

              {/* Display response details */}
              {(checkoutPayload || checkoutResponse) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-surface-container/50 text-xs">
                  <div>
                    <span className="text-label-sm text-secondary block mb-1">Payload Enviado</span>
                    <pre className="p-3 bg-surface-low rounded border border-outline-variant/60 font-mono text-[10px] overflow-auto max-h-40">
                      {JSON.stringify(checkoutPayload, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <span className="text-label-sm text-secondary block mb-1">Respuesta del Servidor</span>
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
                          Ir a Pagar (Mercado Pago Sandbox)
                        </a>
                        <Button
                          variant="secondary"
                          className="text-[11px] px-3 py-1.5"
                          onClick={() => {
                            const link = getSandboxUrl(checkoutResponse.sandboxUrl || checkoutResponse.checkoutUrl);
                            const copied = copyToClipboard(link);
                            if (copied) {
                              triggerToast("Link de pago (Sandbox) copiado al portapapeles.", "success");
                            } else {
                              triggerToast("No se pudo copiar el link.", "error");
                            }
                          }}
                        >
                          📋 Copiar Link
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Grid: Webhook simulation and database check */}
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        {/* Webhook Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="ghost-border shadow-ambient-sm h-full flex flex-col">
            <CardHeader className="border-b border-surface-container/50">
              <CardTitle className="text-headline-md">2. Simular Webhook (Notificación MP)</CardTitle>
              <CardDescription>
                Simula que Mercado Pago notifica el resultado del pago. Actualiza el estado a HELD/REJECTED y dispara el webhook saliente a la Seller App.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block text-label-sm text-secondary mb-1">ID Sesión de Cobro (external_reference)</label>
                  <input
                    type="text"
                    value={sessionIdToPay}
                    onChange={(e) => setSessionIdToPay(e.target.value)}
                    placeholder="cuid o id de la sesión..."
                    className="w-full text-xs font-mono rounded border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[10px] text-on-surface-muted mt-1">
                    Copia y pega un ID de la lista de transacciones recientes o crea un checkout arriba.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-label-sm text-secondary mb-1">Estado de Pago</label>
                    <select
                      value={mockStatus}
                      onChange={(e) => setMockStatus(e.target.value)}
                      className="w-full text-xs rounded border border-outline-variant bg-surface px-2 py-1.5 text-on-surface focus:outline-none"
                    >
                      <option value="approved">Aprobado (approved)</option>
                      <option value="rejected">Rechazado (rejected)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-label-sm text-secondary mb-1">Monto (Opcional)</label>
                    <input
                      type="number"
                      value={mockAmount}
                      onChange={(e) => setMockAmount(e.target.value)}
                      placeholder="Monto final..."
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
                  {webhookLoading ? "Simulando pago..." : `⚡ Disparar Webhook (${mockStatus.toUpperCase()})`}
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

        {/* Database inspector tables */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="ghost-border shadow-ambient-sm h-full flex flex-col">
            <CardHeader className="border-b border-surface-container/50 pb-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-headline-md">Visualizador del Estado en la DB</CardTitle>
                  <CardDescription>
                    Monitorea los registros asociados a tus usuarios simulados en tiempo real.
                  </CardDescription>
                </div>
                <div className="flex bg-surface-container rounded p-0.5 self-start">
                  {[
                    { id: "tx", label: "Transacciones" },
                    { id: "wallet", label: "Wallets" },
                    { id: "ledger", label: "Libro Mayor" },
                    { id: "session", label: "Sesiones" },
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
                  Cargando estado actual de la base de datos...
                </div>
              ) : (
                <div className="text-xs">
                  {/* TAB 1: TRANSACTIONS */}
                  {inspectorTab === "tx" && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-surface-container pb-2 text-on-surface-muted">
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Orden ID</th>
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Monto</th>
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Comprador</th>
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Vendedor</th>
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Estado</th>
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Acción</th>
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
                                <StatusBadge status={tx.status} size="sm" />
                              </td>
                              <td className="py-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-[10px]"
                                  onClick={() => {
                                    setSessionIdToPay(tx.checkoutSessionId);
                                    const copied = copyToClipboard(tx.checkoutSessionId);
                                    if (copied) {
                                      triggerToast(`ID copiado y cargado: ${tx.checkoutSessionId}`, "success");
                                    } else {
                                      triggerToast(`Cargada sesión: ${tx.checkoutSessionId}`, "info");
                                    }
                                  }}
                                  title="Copiar ID de sesión al portapapeles y cargar en el formulario"
                                >
                                  Copiar Sesión
                                </Button>
                              </td>
                            </tr>
                          ))}
                          {dbInspector.transactions.length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center py-10 text-on-surface-muted">
                                No se encontraron transacciones para los usuarios configurados.
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
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Usuario</th>
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Clerk ID</th>
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Saldo Retenido (HELD)</th>
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Saldo Disponible</th>
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
                                No hay billeteras inicializadas aún. Se crean automáticamente al recibir el primer pago aprobado.
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
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Usuario</th>
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Tipo</th>
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Monto</th>
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Descripción</th>
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Fecha</th>
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
                                  {ledger.type}
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
                                No hay registros contables en el libro mayor.
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
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Comprador</th>
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Monto Total</th>
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Estado</th>
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Link de Pago</th>
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Acciones</th>
                            <th className="py-2 text-[10px] font-semibold text-secondary uppercase tracking-wider">Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dbInspector.checkoutSessions.map((session) => (
                            <tr key={session.id} className="border-b border-surface-container/40 hover:bg-surface-low/30">
                              <td className="py-3 font-mono text-[10px] break-all max-w-[120px]">{session.id}</td>
                              <td className="py-3">{getUserName(session.buyerId)}</td>
                              <td className="py-3 font-medium">${Number(session.totalAmount)} ARS</td>
                              <td className="py-3">
                                <StatusBadge status={session.status} size="sm" />
                              </td>
                              <td className="py-3">
                                {session.payments?.[0]?.checkoutUrl ? (
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={getSandboxUrl(session.payments[0].checkoutUrl)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-primary hover:underline font-semibold text-[11px]"
                                      title="Pagar en Mercado Pago Sandbox"
                                    >
                                      💳 Pagar MP (Sandbox)
                                    </a>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 text-secondary hover:bg-surface-low"
                                      onClick={() => {
                                        const link = getSandboxUrl(session.payments[0].checkoutUrl);
                                        const copied = copyToClipboard(link);
                                        if (copied) {
                                          triggerToast("Link de pago (Sandbox) copiado al portapapeles.", "success");
                                        } else {
                                          triggerToast("No se pudo copiar el link.", "error");
                                        }
                                      }}
                                      title="Copiar link de pago Sandbox al portapapeles"
                                    >
                                      📋
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-on-surface-muted italic text-[10px]">Sin link</span>
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
                                      triggerToast(`ID copiado al portapapeles y cargado: ${session.id}`, "success");
                                    } else {
                                      triggerToast(`Cargada sesión: ${session.id}`, "info");
                                    }
                                  }}
                                  title="Copiar ID de sesión al portapapeles y cargar en el formulario"
                                >
                                  Copiar ID
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
                                No se encontraron sesiones de checkout.
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
    </div>
  );
}
