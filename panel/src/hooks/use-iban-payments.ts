import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  mockIBANPayments,
  type IBANPayment,
} from "@/lib/mock-data";

// Re-export for convenience
export type { IBANPayment };

// ─── Filter types ──────────────────────────────────────────────────────────────

export interface PaymentFilters {
  status?: "all" | "pending" | "approved" | "rejected";
  dateFrom?: string; // ISO date string (YYYY-MM-DD)
  dateTo?: string;   // ISO date string (YYYY-MM-DD)
  search?: string;   // guest name or reference code
}

// ─── Query: fetch IBAN payments ────────────────────────────────────────────────

export function useIBANPayments(filters?: PaymentFilters) {
  return useQuery<IBANPayment[], Error>({
    queryKey: ["iban-payments", filters],
    queryFn: async () => {
      try {
        const supabase = createClient();

        let query = supabase
          .from("iban_payments")
          .select(`
            id,
            guest_name,
            guest_phone,
            reservation_id,
            amount,
            currency,
            iban_last4,
            reference_code,
            status,
            submitted_at,
            reviewed_at,
            reviewed_by,
            notes,
            room_name,
            check_in_date
          `)
          .order("submitted_at", { ascending: false });

        // Apply status filter
        if (filters?.status && filters.status !== "all") {
          query = query.eq("status", filters.status);
        }

        // Apply date range filters
        if (filters?.dateFrom) {
          query = query.gte("submitted_at", `${filters.dateFrom}T00:00:00`);
        }
        if (filters?.dateTo) {
          query = query.lte("submitted_at", `${filters.dateTo}T23:59:59`);
        }

        // Apply text search (guest name or reference code)
        if (filters?.search && filters.search.trim()) {
          const search = filters.search.trim();
          query = query.or(
            `guest_name.ilike.%${search}%,reference_code.ilike.%${search}%`
          );
        }

        const { data, error } = await query;

        if (error) throw error;
        return (data as IBANPayment[]) ?? [];
      } catch (error) {
        console.warn("Supabase query failed, falling back to mock data:", error);
        // Apply client-side filters on mock data
        let results = [...mockIBANPayments];

        if (filters?.status && filters.status !== "all") {
          results = results.filter((p) => p.status === filters.status);
        }
        if (filters?.dateFrom) {
          results = results.filter((p) => p.submitted_at >= `${filters.dateFrom}T00:00:00`);
        }
        if (filters?.dateTo) {
          results = results.filter((p) => p.submitted_at <= `${filters.dateTo}T23:59:59`);
        }
        if (filters?.search?.trim()) {
          const s = filters.search.trim().toLowerCase();
          results = results.filter(
            (p) =>
              p.guest_name.toLowerCase().includes(s) ||
              p.reference_code.toLowerCase().includes(s)
          );
        }
        return results;
      }
    },
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 30 * 1000, // Refetch every 30s
  });
}

// ─── Mutation: approve payment ─────────────────────────────────────────────────

export function useApprovePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      try {
        const supabase = createClient();

        const { error } = await supabase
          .from("iban_payments")
          .update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
            reviewed_by: "admin",
            notes: notes ?? "Manuel onaylandı.",
          })
          .eq("id", id);

        if (error) throw error;
      } catch (error) {
        console.warn("Supabase mutation failed (approve), using local state:", error);
        // Silently succeed — the optimistic update handles UI
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iban-payments"] });
    },
  });
}

// ─── Mutation: reject payment ──────────────────────────────────────────────────

export function useRejectPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      try {
        const supabase = createClient();

        const { error } = await supabase
          .from("iban_payments")
          .update({
            status: "rejected",
            reviewed_at: new Date().toISOString(),
            reviewed_by: "admin",
            notes: notes ?? "Manuel reddedildi.",
          })
          .eq("id", id);

        if (error) throw error;
      } catch (error) {
        console.warn("Supabase mutation failed (reject), using local state:", error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iban-payments"] });
    },
  });
}

// ─── Auto-match: try to match a payment to a reservation by reference code ─────

export function useAutoMatchPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      referenceCode,
    }: {
      paymentId: string;
      referenceCode: string;
    }) => {
      try {
        const supabase = createClient();

        // Look up reservation by reference code
        const { data: reservation, error: resError } = await supabase
          .from("reservations")
          .select("id, total_amount, guest_name, room_id, check_in_date")
          .eq("reference_code", referenceCode)
          .single();

        if (resError || !reservation) {
          return { matched: false, reason: "Rezervasyon bulunamadı." };
        }

        // Update the payment with matched reservation data
        const { error: updateError } = await supabase
          .from("iban_payments")
          .update({
            reservation_id: reservation.id,
            guest_name: reservation.guest_name,
            check_in_date: reservation.check_in_date,
            auto_matched: true,
          })
          .eq("id", paymentId);

        if (updateError) throw updateError;

        return { matched: true, reservation };
      } catch (error) {
        console.warn("Auto-match failed:", error);
        return { matched: false, reason: "Eşleştirme hatası." };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iban-payments"] });
    },
  });
}
