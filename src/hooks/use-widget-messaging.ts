"use client";

import { useState, useCallback, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WidgetMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sent_at: string;
}

interface WidgetConversationResponse {
  conversation_id: string;
  tenant_id: string;
  messages: WidgetMessage[];
  settings: {
    property_name: string | null;
    welcome_message: string | null;
    currency: string;
    check_in_time: string;
    check_out_time: string;
  };
}

interface WidgetState {
  conversationId: string | null;
  messages: WidgetMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  settings: WidgetConversationResponse["settings"] | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWidgetMessaging(tenantSlug: string | null) {
  const [state, setState] = useState<WidgetState>({
    conversationId: null,
    messages: [],
    isLoading: false,
    isSending: false,
    error: null,
    settings: null,
  });
  const [guestPhone, setGuestPhone] = useState<string>("");
  const [guestName, setGuestName] = useState<string>("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const convIdRef = useRef<string | null>(null);

  // Generate a persistent guest ID for widget-only users
  const getOrCreateGuestId = useCallback(() => {
    let id = localStorage.getItem("widget_guest_id");
    if (!id) {
      id = `widget-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("widget_guest_id", id);
    }
    return id;
  }, []);

  // Initialize conversation
  const initConversation = useCallback(async () => {
    if (!tenantSlug) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const guestId = getOrCreateGuestId();
    const phone = guestPhone || guestId;

    try {
      const res = await fetch("/api/widget/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_slug: tenantSlug,
          guest_phone: phone,
          guest_name: guestName || undefined,
        }),
      });

      const data: WidgetConversationResponse & { error?: string } =
        await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Bağlantı kurulamadı");
      }

      convIdRef.current = data.conversation_id;

      setState((prev) => ({
        ...prev,
        conversationId: data.conversation_id,
        messages: data.messages,
        isLoading: false,
        settings: data.settings,
        error: null,
      }));

      // Start polling
      startPolling(data.conversation_id);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          err instanceof Error
            ? err.message
            : "Bağlantı kurulamadı. Lütfen tekrar deneyin.",
      }));
    }
  }, [tenantSlug, guestPhone, guestName, getOrCreateGuestId]);

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      const convId = convIdRef.current;
      if (!convId || !content.trim()) return;

      setState((prev) => ({ ...prev, isSending: true }));

      // Optimistic add
      const optimistic: WidgetMessage = {
        id: `optimistic-${Date.now()}`,
        conversation_id: convId,
        role: "user",
        content: content.trim(),
        sent_at: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, optimistic],
        isSending: true,
      }));

      try {
        const res = await fetch("/api/widget/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: convId,
            content: content.trim(),
            guest_name: guestName || undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || "Mesaj gönderilemedi");
        }

        // Replace optimistic with real
        setState((prev) => ({
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === optimistic.id ? data.message : m
          ),
          isSending: false,
        }));
      } catch (err) {
        // Remove optimistic on error
        setState((prev) => ({
          ...prev,
          messages: prev.messages.filter((m) => m.id !== optimistic.id),
          isSending: false,
          error:
            err instanceof Error
              ? err.message
              : "Mesaj gönderilemedi",
        }));
      }
    },
    [guestName]
  );

  // Poll for new messages
  const startPolling = useCallback((convId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const since =
          state.messages.length > 0
            ? state.messages[state.messages.length - 1].sent_at
            : undefined;

        const params = new URLSearchParams({ conversation_id: convId });
        if (since) params.set("since", since);

        const res = await fetch(`/api/widget/messages?${params}`);
        const data = await res.json();

        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setState((prev) => {
            const existingIds = new Set(prev.messages.map((m) => m.id));
            const newMsgs = data.messages.filter(
              (m: WidgetMessage) => !existingIds.has(m.id)
            );
            if (newMsgs.length === 0) return prev;
            return { ...prev, messages: [...prev.messages, ...newMsgs] };
          });
        }
      } catch {
        // Silent poll failure
      }
    }, 3000); // Poll every 3s
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  return {
    ...state,
    guestPhone,
    setGuestPhone,
    guestName,
    setGuestName,
    initConversation,
    sendMessage,
  };
}
