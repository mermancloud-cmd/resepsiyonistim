"use client";

import * as React from "react";
import { useAssignVariant } from "@/hooks/use-ab-tests";

// ─── Context ─────────────────────────────────────────────────────────────────

interface ABTestContextValue {
  variant: "control" | "treatment" | null;
  testId: string | null;
  isLoading: boolean;
}

const ABTestContext = React.createContext<ABTestContextValue>({
  variant: null,
  testId: null,
  isLoading: false,
});

export function useABTestVariant() {
  return React.useContext(ABTestContext);
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ABTestWrapperProps {
  /** A/B test ID to assign variant for */
  testId: string;
  /** Conversation ID (for sticky assignment) */
  conversationId?: string;
  /** Fallback variant when no active test */
  fallback?: "control" | "treatment";
  children: React.ReactNode;
}

/**
 * ABTestWrapper assigns a random variant (control/treatment) per conversation
 * and makes it available via useABTestVariant() to any descendant component.
 *
 * Usage:
 *   <ABTestWrapper testId="...">
 *     {variant === 'treatment' ? <NewComponent /> : <CurrentComponent />}
 *   </ABTestWrapper>
 *
 * For simple inline branching, use the render-prop pattern via context:
 *   const { variant } = useABTestVariant()
 *   const prompt = variant === 'treatment' ? treatmentPrompt : controlPrompt
 */
export function ABTestWrapper({
  testId,
  conversationId,
  fallback = "control",
  children,
}: ABTestWrapperProps) {
  const { data: assignedVariant, isLoading } = useAssignVariant(conversationId);

  const value = React.useMemo<ABTestContextValue>(
    () => ({
      variant: (assignedVariant as "control" | "treatment" | null) ?? fallback,
      testId,
      isLoading,
    }),
    [assignedVariant, fallback, testId, isLoading]
  );

  return (
    <ABTestContext.Provider value={value}>
      {children}
    </ABTestContext.Provider>
  );
}
