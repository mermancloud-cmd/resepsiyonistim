"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { AUTH_CONSTANTS } from "@/lib/auth-utils";

/**
 * Hook: Detects user inactivity and auto-logs out after timeout.
 * Uses the centralized AuthContext for session management.
 */
export function useSessionTimeout(
  timeoutMs: number = AUTH_CONSTANTS.SESSION_INACTIVITY_TIMEOUT_MS
) {
  const { signOut, isAuthenticated } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const handleLogout = useCallback(async () => {
    // Redirect with session_expired reason
    if (typeof window !== "undefined") {
      window.location.href = "/login?reason=session_expired";
    }
    await signOut();
  }, [signOut]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(handleLogout, timeoutMs);
  }, [handleLogout, timeoutMs]);

  useEffect(() => {
    // Only track activity when authenticated
    if (!isAuthenticated) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    const onActivity = () => resetTimer();
    events.forEach((event) => {
      document.addEventListener(event, onActivity, { passive: true });
    });

    resetTimer();

    // Warn user 5 minutes before timeout
    const warningMs = Math.max(timeoutMs - 5 * 60 * 1000, timeoutMs * 0.9);
    const warningTimer = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= warningMs && elapsed < timeoutMs) {
        window.dispatchEvent(
          new CustomEvent("session-timeout-warning", {
            detail: { remainingMs: timeoutMs - elapsed, timeoutMs },
          })
        );
      }
    }, 30_000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearInterval(warningTimer);
      events.forEach((event) => {
        document.removeEventListener(event, onActivity);
      });
    };
  }, [resetTimer, timeoutMs, isAuthenticated]);

  return { resetTimer, handleLogout };
}
