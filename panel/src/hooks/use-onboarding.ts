"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import type { OnboardingStepStatus } from "@/lib/onboarding/types";

const supabase = createClient();

interface UseOnboardingReturn {
  stepStatuses: OnboardingStepStatus[];
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
  completedCount: number;
  allComplete: boolean;
  businessId: string | null;
  savedProgress: Partial<Record<number, Record<string, unknown>>> | null;
  lastCompletedStep: number;
  initOnboarding: () => Promise<void>;
  completeStep: (stepNumber: number, stepData: Record<string, unknown>) => Promise<boolean>;
  checkComplete: () => Promise<boolean>;
  activateBusiness: () => Promise<boolean>;
}

export function useOnboarding(): UseOnboardingReturn {
  const [stepStatuses, setStepStatuses] = React.useState<OnboardingStepStatus[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isInitializing, setIsInitializing] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [businessId, setBusinessId] = React.useState<string | null>(null);
  const [savedProgress, setSavedProgress] = React.useState<Partial<Record<number, Record<string, unknown>>> | null>(null);

  const completedCount = React.useMemo(
    () => stepStatuses.filter((s) => s.completed).length,
    [stepStatuses]
  );

  const allComplete = completedCount === 12;

  // Get the last completed step number (for resume functionality)
  const lastCompletedStep = React.useMemo(() => {
    const completed = stepStatuses.filter((s) => s.completed);
    if (completed.length === 0) return 0;
    return Math.max(...completed.map((s) => s.stepNumber));
  }, [stepStatuses]);

  // Get business ID from the current user session
  const getBusinessId = React.useCallback(async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Try bungalows table first (new schema from parent task)
      const { data: bungalow } = await supabase
        .from("bungalows")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (bungalow?.id) return bungalow.id;

      // Fallback: businesses table
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      return business?.id ?? null;
    } catch {
      return null;
    }
  }, []);

  // Initialize onboarding: load step statuses AND saved progress data
  const initOnboarding = React.useCallback(async () => {
    setIsInitializing(true);
    setError(null);

    try {
      const bizId = await getBusinessId();
      if (!bizId) {
        setError("İşletme bulunamadı. Lütfen önce giriş yapın.");
        return;
      }
      setBusinessId(bizId);

      // 1. Try to load saved progress data from bungalows.onboarding_progress JSONB
      //    This is the new column created by the parent DB schema task
      let progressData: Partial<Record<number, Record<string, unknown>>> = {};
      try {
        const { data: bungalowRow } = await supabase
          .from("bungalows")
          .select("onboarding_progress, onboarding_completed")
          .eq("id", bizId)
          .single();

        if (bungalowRow?.onboarding_progress && typeof bungalowRow.onboarding_progress === "object") {
          // onboarding_progress is stored as { "1": {...data}, "2": {...data}, ... }
          progressData = bungalowRow.onboarding_progress as Partial<Record<number, Record<string, unknown>>>;
          setSavedProgress(progressData);
        }
      } catch {
        // bungalows table may not have the column yet, continue
      }

      // 2. Initialize/load step statuses via RPC
      const { data, error: rpcError } = await supabase.rpc(
        "init_onboarding_steps",
        { p_business_id: bizId }
      );

      if (rpcError) {
        console.warn("init_onboarding_steps RPC not available:", rpcError.message);

        // Build step statuses from saved progress data if available
        const progressKeys = Object.keys(progressData);
        const fallbackStatuses: OnboardingStepStatus[] = Array.from(
          { length: 12 },
          (_, i) => {
            const stepNum = i + 1;
            const hasProgress = progressKeys.includes(String(stepNum));
            return {
              stepNumber: stepNum,
              label: "",
              completed: hasProgress,
              completedAt: hasProgress ? new Date().toISOString() : null,
            };
          }
        );
        setStepStatuses(fallbackStatuses);
        return;
      }

      if (Array.isArray(data)) {
        setStepStatuses(
          data.map((row: { step_number: number; is_completed: boolean; completed_at: string | null }) => ({
            stepNumber: row.step_number,
            label: "",
            completed: row.is_completed,
            completedAt: row.completed_at,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to init onboarding:", err);
      const fallbackStatuses: OnboardingStepStatus[] = Array.from(
        { length: 12 },
        (_, i) => ({
          stepNumber: i + 1,
          label: "",
          completed: false,
          completedAt: null,
        })
      );
      setStepStatuses(fallbackStatuses);
    } finally {
      setIsInitializing(false);
    }
  }, [getBusinessId]);

  // Complete a single step: save data via update_onboarding_progress RPC
  // This stores step data in bungalows.onboarding_progress JSONB
  const completeStep = React.useCallback(
    async (stepNumber: number, stepData: Record<string, unknown>): Promise<boolean> => {
      if (!businessId) return false;

      setIsLoading(true);
      setError(null);

      try {
        // Primary: use the new update_onboarding_progress RPC
        // Created by parent DB schema task (t_0001d90b)
        // Args: p_business_id UUID, p_step_number INTEGER, p_step_data JSONB
        const { error: rpcError } = await supabase.rpc("update_onboarding_progress", {
          p_business_id: businessId,
          p_step_number: stepNumber,
          p_step_data: stepData,
        });

        if (rpcError) {
          console.warn("update_onboarding_progress RPC error:", rpcError.message);

          // Fallback: try complete_onboarding_step RPC (legacy)
          const { error: legacyError } = await supabase.rpc("complete_onboarding_step", {
            p_business_id: businessId,
            p_step_number: stepNumber,
            p_step_data: stepData,
          });

          if (legacyError) {
            console.warn("complete_onboarding_step RPC also failed:", legacyError.message);
          }
        }

        // Update local state
        setStepStatuses((prev) =>
          prev.map((s) =>
            s.stepNumber === stepNumber
              ? { ...s, completed: true, completedAt: new Date().toISOString() }
              : s
          )
        );

        // Update saved progress cache
        setSavedProgress((prev) => ({
          ...prev,
          [stepNumber]: stepData,
        }));

        return true;
      } catch (err) {
        console.error("Failed to complete step:", err);
        setError(`Adım ${stepNumber} kaydedilemedi.`);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [businessId]
  );

  // Check if all steps are complete
  const checkComplete = React.useCallback(async (): Promise<boolean> => {
    if (!businessId) return false;

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "check_onboarding_complete",
        { p_business_id: businessId }
      );

      if (rpcError) {
        return completedCount === 12;
      }

      return data === true;
    } catch {
      return completedCount === 12;
    }
  }, [businessId, completedCount]);

  // Activate the business (final binary gate)
  // Sets onboarding_completed = true and activates Elif AI for this tenant
  const activateBusiness = React.useCallback(async (): Promise<boolean> => {
    if (!businessId || !allComplete) return false;

    setIsLoading(true);
    setError(null);

    try {
      // Try the dedicated RPC first
      const { error: rpcError } = await supabase.rpc("activate_business", {
        p_business_id: businessId,
      });

      if (rpcError) {
        console.warn("activate_business RPC not available:", rpcError.message);

        // Fallback: directly update the bungalow/business record
        const { error: updateError } = await supabase
          .from("bungalows")
          .update({
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", businessId);

        if (updateError) {
          // Try tenants table as fallback
          await supabase
            .from("tenants")
            .update({
              onboarding_completed: true,
              onboarding_completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", businessId);
        }
      }

      // Trigger Elif AI activation for this tenant
      try {
        const { error: wfError } = await supabase.rpc("activate_wf02", {
          p_tenant_id: businessId,
        });

        if (wfError) {
          console.warn("activate_wf02 RPC not available:", wfError.message);
          await supabase
            .from("tenant_settings")
            .update({ ai_enabled: true, updated_at: new Date().toISOString() })
            .eq("tenant_id", businessId);
        }
      } catch (wfErr) {
        console.warn("WF02 activation fallback failed:", wfErr);
      }

      return true;
    } catch (err) {
      console.error("Failed to activate:", err);
      setError("İşletme aktifleştirilemedi.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [businessId, allComplete]);

  // Auto-init on mount
  React.useEffect(() => {
    initOnboarding();
  }, [initOnboarding]);

  return {
    stepStatuses,
    isLoading,
    isInitializing,
    error,
    completedCount,
    allComplete,
    businessId,
    savedProgress,
    lastCompletedStep,
    initOnboarding,
    completeStep,
    checkComplete,
    activateBusiness,
  };
}
