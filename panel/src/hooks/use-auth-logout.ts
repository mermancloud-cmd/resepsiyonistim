"use client";

import { useCallback } from "react";
import { useAuth } from "@/lib/auth-context";

/**
 * Hook: Provides a hardened logout function.
 * Uses the centralized AuthContext for session cleanup.
 */
export function useAuthLogout() {
  const { signOut } = useAuth();

  const logout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  return logout;
}
