"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { Facility, FacilityUser } from "@/lib/types";

// ─── Context Value Interface ─────────────────────────────────────────────────

interface FacilityContextValue {
  facilities: Facility[];
  selectedFacilityId: string | null;
  selectedFacility: Facility | null;
  setSelectedFacilityId: (id: string | null) => void;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  getFacilityName: (id: string | null) => string;
  count: number;
}

const FacilityContext = createContext<FacilityContextValue | null>(null);

export function useFacilities(): FacilityContextValue {
  const ctx = useContext(FacilityContext);
  if (!ctx) {
    throw new Error("useFacilities must be used within <FacilityProvider>");
  }
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FacilityProvider({ children }: { children: ReactNode }) {
  const { tenant, isAuthenticated } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(
    null
  );

  // Restore persisted selection
  useEffect(() => {
    const saved = localStorage.getItem("selectedFacilityId");
    if (saved) {
      setSelectedFacilityId(saved);
    }
  }, []);

  const setAndPersist = useCallback((id: string | null) => {
    setSelectedFacilityId(id);
    if (id) {
      localStorage.setItem("selectedFacilityId", id);
    } else {
      localStorage.removeItem("selectedFacilityId");
    }
  }, []);

  const {
    data: facilities = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Facility[], Error>({
    queryKey: ["facilities", tenant?.id],
    enabled: isAuthenticated && !!tenant,
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("facilities")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (err) throw new Error(err.message);
      return (data ?? []) as Facility[];
    },
    staleTime: 30 * 1000,
  });

  const selectedFacility = useMemo(() => {
    if (!selectedFacilityId || facilities.length === 0) return null;
    return facilities.find((f) => f.id === selectedFacilityId) ?? null;
  }, [selectedFacilityId, facilities]);

  // Auto-select single facility
  useEffect(() => {
    if (facilities.length === 1 && !selectedFacilityId) {
      setSelectedFacilityId(facilities[0].id);
      localStorage.setItem("selectedFacilityId", facilities[0].id);
    }
  }, [facilities, selectedFacilityId]);

  // Reset if selected no longer exists
  useEffect(() => {
    if (selectedFacilityId && facilities.length > 0) {
      const exists = facilities.some((f) => f.id === selectedFacilityId);
      if (!exists) {
        setSelectedFacilityId(null);
        localStorage.removeItem("selectedFacilityId");
      }
    }
  }, [facilities, selectedFacilityId]);

  const getFacilityName = useCallback(
    (id: string | null): string => {
      if (!id) return "Tüm Tesisler";
      const f = facilities.find((f) => f.id === id);
      return f?.name ?? "Bilinmeyen Tesis";
    },
    [facilities]
  );

  const value = useMemo<FacilityContextValue>(
    () => ({
      facilities,
      selectedFacilityId,
      selectedFacility,
      setSelectedFacilityId: setAndPersist,
      isLoading,
      error: error?.message ?? null,
      refetch,
      getFacilityName,
      count: facilities.length,
    }),
    [
      facilities,
      selectedFacilityId,
      selectedFacility,
      setAndPersist,
      isLoading,
      error,
      refetch,
      getFacilityName,
    ]
  );

  return (
    <FacilityContext.Provider value={value}>
      {children}
    </FacilityContext.Provider>
  );
}

// ─── CRUD Hooks ────────────────────────────────────────────────────────────────

export function useCreateFacility() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  return useMutation({
    mutationFn: async (input: {
      name: string;
      slug: string;
      type: Facility["type"];
      address?: string;
      phone?: string;
    }) => {
      const { data, error: err } = await supabase
        .from("facilities")
        .insert({
          tenant_id: tenant!.id,
          name: input.name,
          slug: input.slug,
          type: input.type,
          address: input.address ?? null,
          phone: input.phone ?? null,
          settings: {},
        })
        .select()
        .single();

      if (err) throw new Error(err.message);
      return data as Facility;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
    },
  });
}

export function useUpdateFacility() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  return useMutation({
    mutationFn: async (input: Partial<Facility> & { id: string }) => {
      const { data, error: err } = await supabase
        .from("facilities")
        .update(input)
        .eq("id", input.id)
        .select()
        .single();

      if (err) throw new Error(err.message);
      return data as Facility;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
    },
  });
}

export function useDeleteFacility() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  return useMutation({
    mutationFn: async (id: string) => {
      const { error: err } = await supabase
        .from("facilities")
        .delete()
        .eq("id", id);

      if (err) throw new Error(err.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
    },
  });
}

export function useFacilityUsers(facilityId: string | null) {
  const { tenant, isAuthenticated } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  return useQuery<FacilityUser[], Error>({
    queryKey: ["facility-users", facilityId, tenant?.id],
    enabled: isAuthenticated && !!tenant && !!facilityId,
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("facility_users")
        .select("*")
        .eq("facility_id", facilityId);

      if (err) throw new Error(err.message);
      return (data ?? []) as FacilityUser[];
    },
  });
}
