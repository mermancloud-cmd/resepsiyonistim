"use client";

import { useAuth } from "@/lib/auth-context";

/**
 * Binary Gate hook: Provides auth + onboarding state.
 * Delegates to the centralized AuthContext.
 *
 * Allowed paths even without onboarding: /onboarding, /login, /auth
 */

interface OnboardingGateState {
  isLoading: boolean;
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
  tenantId: string | null;
}

export function useOnboardingGate(): OnboardingGateState {
  const { isLoading, isAuthenticated, tenant } = useAuth();

  return {
    isLoading,
    isAuthenticated,
    onboardingCompleted: tenant?.onboarding_completed ?? false,
    tenantId: tenant?.id ?? null,
  };
}
