"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { validateIBAN, normalizeIBAN } from "@/lib/iban";
import type { BankAccount, BankAccountInput } from "@/lib/types";

// ─── Query key factory ───────────────────────────────────────────────────────

export const bankAccountKeys = {
  all: ["bank-accounts"] as const,
  list: (filters?: { facility_id?: string | null }) =>
    ["bank-accounts", "list", filters] as const,
};

// ─── Query: list bank accounts (tenant-scoped) ─────────────────────────────

export function useBankAccounts(facilityId?: string | null) {
  const { tenant, isAuthenticated } = useAuth();

  return useQuery<BankAccount[], Error>({
    queryKey: bankAccountKeys.list({ facility_id: facilityId }),
    enabled: isAuthenticated && !!tenant,
    queryFn: async () => {
      const supabase = createClient();

      let query = supabase
        .from("bank_accounts")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("sort_order", { ascending: true })
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      // Filter by facility if specified
      if (facilityId) {
        query = query.eq("facility_id", facilityId);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);
      return (data ?? []) as BankAccount[];
    },
    staleTime: 15 * 1000,
  });
}

// ─── Query: single bank account ─────────────────────────────────────────────

export function useBankAccount(id: string | null) {
  const { tenant, isAuthenticated } = useAuth();

  return useQuery<BankAccount | null, Error>({
    queryKey: ["bank-accounts", id],
    enabled: isAuthenticated && !!tenant && !!id,
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenant!.id)
        .single();

      if (error) throw new Error(error.message);
      return data as BankAccount;
    },
  });
}

// ─── Validation ─────────────────────────────────────────────────────────────

export interface BankAccountValidationErrors {
  bank_name?: string;
  account_holder?: string;
  iban?: string;
  currency?: string;
}

export function validateBankAccountInput(
  input: BankAccountInput
): BankAccountValidationErrors {
  const errors: BankAccountValidationErrors = {};

  if (!input.bank_name.trim()) {
    errors.bank_name = "Banka adı zorunludur";
  }

  if (!input.account_holder.trim()) {
    errors.account_holder = "Hesap sahibi zorunludur";
  }

  if (!input.iban.trim()) {
    errors.iban = "IBAN numarası zorunludur";
  } else {
    const validation = validateIBAN(input.iban);
    if (!validation.valid && validation.errorMessage) {
      errors.iban = validation.errorMessage;
    }
  }

  if (!input.currency) {
    errors.currency = "Para birimi seçiniz";
  }

  return errors;
}

// ─── Mutation: create bank account ──────────────────────────────────────────

export function useCreateBankAccount() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BankAccountInput) => {
      const supabase = createClient();
      const cleanIban = normalizeIBAN(input.iban);

      // Validate before sending
      const ibanValidation = validateIBAN(cleanIban);
      if (!ibanValidation.valid) {
        throw new Error(ibanValidation.errorMessage ?? "Geçersiz IBAN");
      }

      const { data, error } = await supabase
        .from("bank_accounts")
        .insert({
          tenant_id: tenant!.id,
          facility_id: input.facility_id ?? null,
          bank_name: input.bank_name.trim(),
          branch_name: input.branch_name?.trim() ?? null,
          account_holder: input.account_holder.trim(),
          iban: cleanIban,
          currency: input.currency,
          is_default: input.is_default ?? false,
          is_active: true,
          swift_code: input.swift_code?.trim() ?? null,
          description: input.description?.trim() ?? null,
          sort_order: 0,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as BankAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.all });
    },
  });
}

// ─── Mutation: update bank account ──────────────────────────────────────────

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<BankAccount> & { id: string }) => {
      const supabase = createClient();

      // If IBAN is being updated, normalize it
      const payload = { ...updates };
      if (payload.iban) {
        payload.iban = normalizeIBAN(payload.iban);
      }

      const { data, error } = await supabase
        .from("bank_accounts")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as BankAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.all });
    },
  });
}

// ─── Mutation: set as default ───────────────────────────────────────────────

export function useSetDefaultBankAccount() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tenantId }: { id: string; tenantId: string }) => {
      const supabase = createClient();

      // Unset all defaults for this tenant
      const { error: resetError } = await supabase
        .from("bank_accounts")
        .update({ is_default: false })
        .eq("tenant_id", tenantId)
        .eq("is_default", true);

      if (resetError) throw new Error(resetError.message);

      // Set new default
      const { data, error } = await supabase
        .from("bank_accounts")
        .update({ is_default: true })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as BankAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.all });
    },
  });
}

// ─── Mutation: delete bank account ──────────────────────────────────────────

export function useDeleteBankAccount() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("bank_accounts")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenant!.id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.all });
    },
    // After deletion, if the deleted account was default, trigger check
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.all });
    },
  });
}

// ─── Mutation: toggle active status ─────────────────────────────────────────

export function useToggleBankAccountStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("bank_accounts")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as BankAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.all });
    },
  });
}
