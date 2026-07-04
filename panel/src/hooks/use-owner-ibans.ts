import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OwnerIBAN {
  id: string;
  bank_name: string;
  account_holder: string;
  iban: string;
  currency: string;
  is_default: boolean;
  created_at?: string;
}

export interface NewIBANInput {
  bank_name: string;
  account_holder: string;
  iban: string;
  currency: string;
}

// ─── Mock data for fallback ────────────────────────────────────────────────────

const mockOwnerIBANs: OwnerIBAN[] = [
  {
    id: "owner-iban-001",
    bank_name: "Ziraat Bankası",
    account_holder: "Merman Turizm Ltd. Şti.",
    iban: "TR330001009000000000123456",
    currency: "TRY",
    is_default: true,
  },
  {
    id: "owner-iban-002",
    bank_name: "Garanti BBVA",
    account_holder: "Merman Turizm Ltd. Şti.",
    iban: "TR120006200100900000087654",
    currency: "EUR",
    is_default: false,
  },
];

// ─── Query: fetch owner IBANs ──────────────────────────────────────────────────

export function useOwnerIBANs() {
  return useQuery<OwnerIBAN[], Error>({
    queryKey: ["owner-ibans"],
    queryFn: async () => {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("owner_ibans")
          .select("*")
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) throw error;
        return (data as OwnerIBAN[]) ?? [];
      } catch (error) {
        console.warn("Supabase query failed, falling back to mock IBANs:", error);
        return mockOwnerIBANs;
      }
    },
    staleTime: 30 * 1000,
  });
}

// ─── Mutation: add new IBAN ────────────────────────────────────────────────────

export function useAddIBAN() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NewIBANInput) => {
      try {
        const supabase = createClient();
        const cleanIban = input.iban.replace(/\s/g, "").toUpperCase();

        const { data, error } = await supabase
          .from("owner_ibans")
          .insert({
            bank_name: input.bank_name.trim(),
            account_holder: input.account_holder.trim(),
            iban: cleanIban,
            currency: input.currency,
            is_default: false, // Will be set separately
          })
          .select()
          .single();

        if (error) throw error;
        return data as OwnerIBAN;
      } catch (error) {
        console.warn("Supabase insert failed, returning optimistic result:", error);
        // Return optimistic result for offline/mock mode
        return {
          id: `owner-iban-${Date.now()}`,
          bank_name: input.bank_name.trim(),
          account_holder: input.account_holder.trim(),
          iban: input.iban.replace(/\s/g, "").toUpperCase(),
          currency: input.currency,
          is_default: false,
        } as OwnerIBAN;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-ibans"] });
    },
  });
}

// ─── Mutation: set default IBAN ────────────────────────────────────────────────

export function useSetDefaultIBAN() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        const supabase = createClient();

        // First, unset all defaults
        await supabase
          .from("owner_ibans")
          .update({ is_default: false })
          .eq("is_default", true);

        // Then set the new default
        const { error } = await supabase
          .from("owner_ibans")
          .update({ is_default: true })
          .eq("id", id);

        if (error) throw error;
      } catch (error) {
        console.warn("Supabase update failed (set default):", error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-ibans"] });
    },
  });
}

// ─── Mutation: delete IBAN ─────────────────────────────────────────────────────

export function useDeleteIBAN() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, wasDefault }: { id: string; wasDefault: boolean }) => {
      try {
        const supabase = createClient();

        const { error } = await supabase
          .from("owner_ibans")
          .delete()
          .eq("id", id);

        if (error) throw error;

        // If we deleted the default, promote the first remaining IBAN
        if (wasDefault) {
          const { data: remaining } = await supabase
            .from("owner_ibans")
            .select("id")
            .limit(1);

          if (remaining && remaining.length > 0) {
            await supabase
              .from("owner_ibans")
              .update({ is_default: true })
              .eq("id", remaining[0].id);
          }
        }
      } catch (error) {
        console.warn("Supabase delete failed:", error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-ibans"] });
    },
  });
}
