"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWidgetMessaging } from "@/hooks/use-widget-messaging";

// ─── Types ────────────────────────────────────────────────────────────────────

type WidgetTheme = "light" | "dark" | "auto";
type WidgetPosition = "right" | "left";

interface WidgetConfig {
  primary?: string;
  position?: WidgetPosition;
  greeting?: string;
  placeholder?: string;
  theme?: WidgetTheme;
  logo?: string;
  businessName?: string;
  tenantSlug?: string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: WidgetConfig = {
  primary: "#0f766e",
  position: "right",
  greeting: "Merhaba! Size nasıl yardımcı olabilirim?",
  placeholder: "Mesajınızı yazın...",
  theme: "auto",
  businessName: "İşletme",
  tenantSlug: "merman-bungalov",
};

// ─── Theme resolver ────────────────────────────────────────────────────────────

function resolveTheme(theme: WidgetTheme): "light" | "dark" {
  if (theme === "light") return "light";
  if (theme === "dark") return "dark";
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// ─── URL param parser ──────────────────────────────────────────────────────────

function parseConfig(): WidgetConfig {
  if (typeof window === "undefined") return DEFAULTS;
  const params = new URLSearchParams(window.location.search);
  const cfg: WidgetConfig = { ...DEFAULTS };

  const str = (key: string) => params.get(key);
  if (str("primary")) cfg.primary = str("primary")!;
  const position = str("position");
  if (position === "left" || position === "right") cfg.position = position;
  if (str("greeting")) cfg.greeting = str("greeting")!;
  if (str("placeholder")) cfg.placeholder = str("placeholder")!;
  if (str("theme") === "light" || str("theme") === "dark" || str("theme") === "auto")
    cfg.theme = str("theme")! as WidgetTheme;
  if (str("logo")) cfg.logo = str("logo")!;
  if (str("businessName")) cfg.businessName = str("businessName")!;
  if (str("tenant")) cfg.tenantSlug = str("tenant")!;

  return cfg;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function WidgetPage() {
  const [config, setConfig] = useState<WidgetConfig>(DEFAULTS);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    isSending,
    initConversation,
    sendMessage,
    guestName,
    setGuestName,
    settings,
  } = useWidgetMessaging(config.tenantSlug ?? null);

  useEffect(() => {
    const cfg = parseConfig();
    setConfig(cfg);
    setMounted(true);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start conversation when bubble opens
  useEffect(() => {
    if (open && mounted && config.tenantSlug) {
      initConversation();
    }
  }, [open, mounted, config.tenantSlug, initConversation]);

  const resolved = resolveTheme(config.theme!);
  const primary = config.primary!;
  const isRight = config.position === "right";

  const greeting = settings?.welcome_message || config.greeting!;
  const businessName = settings?.property_name || config.businessName!;

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    if (!guestName.trim()) {
      setShowNameInput(true);
      return;
    }
    sendMessage(text);
    setInput("");
  }, [input, guestName, sendMessage]);

  const handleNameSubmit = useCallback(() => {
    if (guestName.trim()) {
      setShowNameInput(false);
    }
  }, [guestName]);

  // ── Styles ────────────────────────────────────────────────────────────────

  const s = (props: Record<string, string | number>): React.CSSProperties => props;

  const styles: Record<string, React.CSSProperties> = {
    fab: s({
      position: "fixed",
      bottom: 24,
      [isRight ? "right" : "left"]: 24,
      width: 56,
      height: 56,
      borderRadius: "50%",
      backgroundColor: primary,
      color: "#fff",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
      zIndex: 2147483647,
      transition: "transform 0.2s, box-shadow 0.2s",
    }),
    bubble: s({
      position: "fixed",
      bottom: 92,
      [isRight ? "right" : "left"]: 24,
      width: 360,
      maxWidth: "calc(100vw - 48px)",
      height: 520,
      maxHeight: "calc(100dvh - 120px)",
      borderRadius: 16,
      backgroundColor: resolved === "dark" ? "#1e1e2e" : "#fff",
      color: resolved === "dark" ? "#e4e4e7" : "#1a1a2e",
      boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
      zIndex: 2147483647,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontSize: 14,
      lineHeight: 1.5,
    }),
    header: s({
      padding: "14px 16px",
      backgroundColor: primary,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexShrink: 0,
    }),
    headerAvatar: s({
      width: 36,
      height: 36,
      borderRadius: "50%",
      objectFit: "cover",
      backgroundColor: "rgba(255,255,255,0.2)",
    }),
    headerTitle: s({ fontSize: 15, fontWeight: 600 }),
    headerSub: s({ fontSize: 11, opacity: 0.8 }),
    closeBtn: s({
      marginLeft: "auto",
      background: "none",
      border: "none",
      color: "#fff",
      cursor: "pointer",
      fontSize: 18,
      padding: 4,
      lineHeight: 1,
    }),
    body: s({
      flex: 1,
      overflowY: "auto",
      padding: "12px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }),
    botBubble: s({
      alignSelf: "flex-start",
      backgroundColor: resolved === "dark" ? "#2a2a3e" : "#f1f5f9",
      color: resolved === "dark" ? "#e4e4e7" : "#1a1a2e",
      borderRadius: "4px 16px 16px 16px",
      padding: "10px 14px",
      maxWidth: "85%",
      fontSize: 13,
    }),
    userBubble: s({
      alignSelf: "flex-end",
      backgroundColor: primary,
      color: "#fff",
      borderRadius: "16px 4px 16px 16px",
      padding: "10px 14px",
      maxWidth: "85%",
      fontSize: 13,
    }),
    quickActions: s({
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      padding: "4px 16px 0",
    }),
    quickBtn: s({
      fontSize: 12,
      padding: "6px 12px",
      borderRadius: 20,
      border: `1px solid ${primary}40`,
      backgroundColor: resolved === "dark" ? "#2a2a3e" : "#fff",
      color: primary,
      cursor: "pointer",
      transition: "background 0.15s",
    }),
    footer: s({
      padding: "10px 12px",
      borderTop: `1px solid ${resolved === "dark" ? "#333" : "#e5e7eb"}`,
      display: "flex",
      gap: 8,
      alignItems: "center",
      flexShrink: 0,
    }),
    input: s({
      flex: 1,
      border: `1px solid ${resolved === "dark" ? "#444" : "#d1d5db"}`,
      borderRadius: 24,
      padding: "8px 14px",
      fontSize: 13,
      outline: "none",
      backgroundColor: resolved === "dark" ? "#2a2a3e" : "#fff",
      color: resolved === "dark" ? "#e4e4e7" : "#1a1a2e",
    }),
    sendBtn: s({
      width: 36,
      height: 36,
      borderRadius: "50%",
      backgroundColor: primary,
      color: "#fff",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }),
    nameOverlay: s({
      position: "absolute",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
      borderRadius: 16,
    }),
    nameCard: s({
      backgroundColor: resolved === "dark" ? "#2a2a3e" : "#fff",
      borderRadius: 12,
      padding: 24,
      margin: 16,
      width: "100%",
      maxWidth: 280,
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }),
    nameInput: s({
      border: `1px solid ${resolved === "dark" ? "#555" : "#d1d5db"}`,
      borderRadius: 8,
      padding: "10px 12px",
      fontSize: 14,
      outline: "none",
      backgroundColor: "transparent",
      color: resolved === "dark" ? "#e4e4e7" : "#1a1a2e",
    }),
    nameSubmit: s({
      backgroundColor: primary,
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "10px 16px",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
    }),
    typing: s({
      alignSelf: "flex-start",
      backgroundColor: resolved === "dark" ? "#2a2a3e" : "#f1f5f9",
      borderRadius: "4px 16px 16px 16px",
      padding: "12px 16px",
      maxWidth: "85%",
      fontSize: 13,
    }),
  };

  const QUICK_ACTIONS = [
    "Fiyat bilgisi almak istiyorum",
    "Müsaitlik sorgulama",
    "Rezervasyon yapmak istiyorum",
    "Check-in / check-out saatleri",
  ];

  if (!mounted) return null;

  return (
    <>
      <style>{`
        @keyframes wiggleFadeIn {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0; }
          40% { opacity: 1; }
        }
      `}</style>

      {/* Floating Action Button */}
      <button
        onClick={() => setOpen((p) => !p)}
        style={styles.fab}
        aria-label="Sohbeti aç"
        title="Sohbet"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Chat bubble */}
      {open && (
        <div style={styles.bubble}>
          {/* Header */}
          <div style={styles.header}>
            {config.logo ? (
              <img src={config.logo} alt="" style={styles.headerAvatar} />
            ) : (
              <div style={styles.headerAvatar} />
            )}
            <div>
              <div style={styles.headerTitle}>{businessName}</div>
              <div style={styles.headerSub}>Çevrimiçi</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={styles.closeBtn}
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div style={{ ...styles.body, position: "relative" }}>
            {showNameInput && (
              <div style={styles.nameOverlay}>
                <div style={styles.nameCard}>
                  <p style={{ fontSize: 14, fontWeight: 600, textAlign: "center" }}>
                    Adınız nedir?
                  </p>
                  <input
                    style={styles.nameInput}
                    placeholder="Adınızı yazın..."
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleNameSubmit();
                    }}
                    autoFocus
                  />
                  <button style={styles.nameSubmit} onClick={handleNameSubmit}>
                    Başla
                  </button>
                </div>
              </div>
            )}

            {/* Welcome message */}
            <div style={styles.botBubble}>{greeting}</div>

            {/* Messages */}
            {messages.map((m) => (
              <div
                key={m.id}
                style={m.role === "user" ? styles.userBubble : styles.botBubble}
              >
                {m.content}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div style={styles.typing}>
                <span style={{ display: "inline-flex", gap: 4 }}>
                  <span style={{ animation: "pulse-dot 1.4s infinite", animationDelay: "0s" }}>●</span>
                  <span style={{ animation: "pulse-dot 1.4s infinite", animationDelay: "0.2s" }}>●</span>
                  <span style={{ animation: "pulse-dot 1.4s infinite", animationDelay: "0.4s" }}>●</span>
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions (only before first message) */}
          {messages.length === 0 && !isLoading && (
            <div style={styles.quickActions}>
              {QUICK_ACTIONS.map((q) => (
                <button
                  key={q}
                  style={styles.quickBtn}
                  onClick={() => {
                    if (!guestName.trim()) {
                      setShowNameInput(true);
                      return;
                    }
                    sendMessage(q);
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={styles.footer}>
            <input
              style={styles.input}
              placeholder={config.placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              disabled={isLoading}
            />
            <button
              style={styles.sendBtn}
              onClick={handleSend}
              aria-label="Gönder"
              disabled={isLoading || !input.trim()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
