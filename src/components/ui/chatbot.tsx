"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useLanguage } from "@/lib/contexts/LanguageContext";

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "bot",
  content:
    "¡Hola! Soy **Cashi** 💸, tu asistente financiero de Bonzai.\n\nPodés preguntarme sobre tu saldo, transacciones, disputas, o cómo funciona la plataforma de pagos. ¿En qué te puedo ayudar?",
};

/**
 * Formatea markdown básico (negritas y listas) a HTML inline.
 */
function formatMarkdown(text: string): string {
  // Bold text
  let formatted = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  
  // Lists starting with - or * or • at the start of the string or after a newline
  formatted = formatted.replace(/(?:^|\n)[-*•]\s+(.+?)(?=\n|$)/g, (_, item) => {
    return `<br />• ${item}`;
  });
  
  // Clean up any leading break tags introduced by the list formatter
  formatted = formatted.replace(/^(?:<br \/>)+/, "");
  
  // Newlines to line breaks
  return formatted.replace(/\n/g, "<br />");
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { language, t } = useLanguage();

  // Set or update initial welcome message when language changes
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 0 || (prev.length === 1 && prev[0].id === "welcome")) {
        return [
          {
            id: "welcome",
            role: "bot",
            content: t("chatbot.welcome"),
          },
        ];
      }
      return prev;
    });
  }, [language, t]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus en el input cuando se abre el chat
  useEffect(() => {
    if (isOpen && !isClosing) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isClosing]);

  function handleToggle() {
    if (isOpen) {
      setIsClosing(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
      }, 200);
    } else {
      setIsOpen(true);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    // Agregar mensaje del usuario
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, locale: language }),
      });

      const data = await res.json();

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: "bot",
        content: res.ok
          ? data.reply
          : data.error || t("chatbot.error"),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "bot",
          content: language === "es"
            ? "Error de conexión. Verificá tu internet e intentá de nuevo."
            : "Connection error. Please check your internet and try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        id="cashi-toggle"
        onClick={handleToggle}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-ambient-lg transition-all duration-300 hover:scale-105 hover:bg-primary-container active:scale-95"
        aria-label={isOpen ? (language === "es" ? "Cerrar chat de Cashi" : "Close Cashi chat") : (language === "es" ? "Abrir chat de Cashi" : "Open Cashi chat")}
        title={`Cashi — ${t("chatbot.assistant")}`}
      >
        {isOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <span className="text-2xl leading-none">💸</span>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          id="cashi-panel"
          className={`fixed bottom-24 right-6 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-lowest shadow-ambient-lg ${
            isClosing ? "chat-panel-exit" : "chat-panel-enter"
          }`}
          style={{ height: "min(520px, calc(100vh - 8rem))" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-outline-variant/20 bg-primary px-4 py-3">
            <span className="text-xl leading-none">💸</span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-on-primary">Cashi</h3>
              <p className="text-xs text-on-primary/70">
                {t("chatbot.assistant")}
              </p>
            </div>
            <button
              onClick={handleToggle}
              className="rounded p-1 text-on-primary/70 transition-colors hover:bg-white/10 hover:text-on-primary"
              aria-label={language === "es" ? "Cerrar chat" : "Close chat"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble-enter flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-on-primary rounded-br-sm"
                      : "bg-surface-low text-on-surface rounded-bl-sm ghost-border"
                  }`}
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(msg.content),
                  }}
                />
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="chat-bubble-enter flex justify-start">
                <div className="flex items-center gap-1 rounded-lg bg-surface-low px-4 py-3 ghost-border">
                  <span className="typing-dot h-2 w-2 rounded-full bg-on-surface-muted" />
                  <span className="typing-dot h-2 w-2 rounded-full bg-on-surface-muted" />
                  <span className="typing-dot h-2 w-2 rounded-full bg-on-surface-muted" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-outline-variant/20 bg-surface px-4 py-3"
          >
            <input
              ref={inputRef}
              id="cashi-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("chatbot.placeholder")}
              maxLength={500}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-outline-variant/30 bg-surface-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-muted/60 outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary transition-all duration-200 hover:bg-primary-container active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              aria-label={language === "es" ? "Enviar mensaje" : "Send message"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
