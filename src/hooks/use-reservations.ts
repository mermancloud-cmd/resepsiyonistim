import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { useFacilities } from '@/hooks/use-facilities'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Room {
  room_number: string
  room_type: string
  capacity: number
  price_per_night: number
}

interface Reservation {
  id: string
  tenant_id: string
  facility_id: string | null
  guest_name: string
  guest_email: string
  guest_phone: string | null
  room_id: string
  check_in_date: string
  check_out_date: string
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled'
  total_amount: number
  payment_method: string | null
  payment_status: 'pending' | 'confirmed' | 'rejected'
  payment_notes: string | null
  iban_last4: string | null
  created_at: string
  updated_at: string
  rooms?: Room
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch reservations scoped to the current tenant.
 * Uses Supabase RLS to ensure the owner only sees their own data.
 */
export function useReservations(status?: string) {
  const { tenant, isAuthenticated } = useAuth()
  const { selectedFacilityId } = useFacilities()
  const supabase = createClient()

  return useQuery<{ reservations: Reservation[] }, Error>({
    queryKey: ['reservations', status, tenant?.id, selectedFacilityId],
    enabled: isAuthenticated && !!tenant,
    queryFn: async () => {
      // Direct Supabase query (RLS-protected)
      let query = supabase
        .from('reservations')
        .select('*, rooms(*)')
        .eq('tenant_id', tenant!.id)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      if (selectedFacilityId) {
        query = query.eq('facility_id', selectedFacilityId)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)

      return { reservations: (data ?? []) as Reservation[] }
    },
    staleTime: 10 * 1000,
  })
}

export function useReservation(id: string) {
  const { tenant, isAuthenticated } = useAuth()
  const supabase = createClient()

  return useQuery<{ reservation: Reservation }, Error>({
    queryKey: ['reservation', id, tenant?.id],
    enabled: isAuthenticated && !!tenant && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('*, rooms(*)')
        .eq('id', id)
        .eq('tenant_id', tenant!.id)
        .single()

      if (error) throw new Error(error.message)
      return { reservation: data as Reservation }
    },
    staleTime: 5 * 1000,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUpdateReservationStatus() {
  const queryClient = useQueryClient()
  const { tenant } = useAuth()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      id,
      status
    }: {
      id: string
      status: 'confirmed' | 'rejected' | 'cancelled'
    }) => {
      const { data, error } = await supabase
        .from('reservations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenant!.id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['reservation'] })
    },
  })
}

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient()
  const { tenant } = useAuth()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      id,
      action,
      notes
    }: {
      id: string
      action: 'confirm' | 'reject'
      notes?: string
    }) => {
      const paymentStatus = action === 'confirm' ? 'confirmed' : 'rejected'
      const { data, error } = await supabase
        .from('reservations')
        .update({
          payment_status: paymentStatus,
          payment_notes: notes ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenant!.id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['reservation'] })
    },
  })
}

export function useCreateReservation() {
  const queryClient = useQueryClient()
  const { tenant } = useAuth()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (reservationData: Partial<Reservation>) => {
      const { data, error } = await supabase
        .from('reservations')
        .insert({
          ...reservationData,
          tenant_id: tenant!.id,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
    },
  })
}
