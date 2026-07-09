import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import type { Referral, ReferralCode, ReferralStats } from '@/lib/types'

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch referral stats for the current tenant.
 */
export function useReferralStats() {
  const { tenant, isAuthenticated } = useAuth()
  const supabase = createClient()

  return useQuery<ReferralStats, Error>({
    queryKey: ['referral-stats', tenant?.id],
    enabled: isAuthenticated && !!tenant,
    queryFn: async () => {
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select('status, reward_type, reward_amount, reward_currency')
        .eq('tenant_id', tenant!.id)

      if (error) throw new Error(error.message)

      const total = referrals?.length ?? 0
      const pending = referrals?.filter(r => r.status === 'pending').length ?? 0
      const converted = referrals?.filter(r => r.status === 'converted').length ?? 0
      const rewarded = referrals?.filter(r => r.status === 'rewarded').length ?? 0
      const totalReward = referrals
        ?.filter(r => r.reward_currency === 'TRY')
        .reduce((sum, r) => sum + (r.reward_amount || 0), 0) ?? 0

      // Get active codes count
      const { data: codes } = await supabase
        .from('referral_codes')
        .select('id')
        .eq('tenant_id', tenant!.id)
        .eq('is_active', true)

      return {
        total_referrals: total,
        pending_count: pending,
        converted_count: converted,
        rewarded_count: rewarded,
        total_reward_amount: totalReward,
        conversion_rate: total > 0 ? Math.round((converted / total) * 100) : 0,
        active_codes: codes?.length ?? 0,
      }
    },
    staleTime: 10 * 1000,
  })
}

/**
 * Fetch referrals scoped to the current tenant, with optional status filter.
 */
export function useReferrals(status?: string) {
  const { tenant, isAuthenticated } = useAuth()
  const supabase = createClient()

  return useQuery<{ referrals: Referral[] }, Error>({
    queryKey: ['referrals', status, tenant?.id],
    enabled: isAuthenticated && !!tenant,
    queryFn: async () => {
      let query = supabase
        .from('referrals')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .order('created_at', { ascending: false })

      if (status && status !== 'all') {
        query = query.eq('status', status)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)

      return { referrals: (data ?? []) as Referral[] }
    },
    staleTime: 10 * 1000,
  })
}

/**
 * Fetch referral codes for the current tenant.
 */
export function useReferralCodes() {
  const { tenant, isAuthenticated } = useAuth()
  const supabase = createClient()

  return useQuery<{ codes: ReferralCode[] }, Error>({
    queryKey: ['referral-codes', tenant?.id],
    enabled: isAuthenticated && !!tenant,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      return { codes: (data ?? []) as ReferralCode[] }
    },
    staleTime: 10 * 1000,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create a new referral entry.
 */
export function useCreateReferral() {
  const queryClient = useQueryClient()
  const { tenant } = useAuth()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (referralData: Partial<Referral>) => {
      const { data, error } = await supabase
        .from('referrals')
        .insert({
          ...referralData,
          tenant_id: tenant!.id,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] })
      queryClient.invalidateQueries({ queryKey: ['referral-stats'] })
    },
  })
}

/**
 * Update referral status (e.g., mark as rewarded).
 */
export function useUpdateReferralStatus() {
  const queryClient = useQueryClient()
  const { tenant } = useAuth()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string
      status: Referral['status']
      notes?: string
    }) => {
      const updateData: Partial<Referral> = {
        status,
        updated_at: new Date().toISOString(),
      }
      if (status === 'rewarded') {
        updateData.reward_claimed_at = new Date().toISOString()
      }
      if (notes !== undefined) {
        updateData.notes = notes
      }

      const { data, error } = await supabase
        .from('referrals')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenant!.id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] })
      queryClient.invalidateQueries({ queryKey: ['referral-stats'] })
    },
  })
}

/**
 * Create a new referral code.
 */
export function useCreateReferralCode() {
  const queryClient = useQueryClient()
  const { tenant } = useAuth()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (codeData: {
      description?: string
      reward_type: ReferralCode['reward_type']
      reward_amount: number
      reward_currency: string
      max_uses?: number
    }) => {
      // Generate code server-side via RPC
      const { data: code, error: rpcError } = await supabase.rpc(
        'generate_referral_code',
        {
          p_tenant_id: tenant!.id,
          p_description: codeData.description ?? null,
          p_reward_type: codeData.reward_type,
          p_reward_amount: codeData.reward_amount,
          p_reward_currency: codeData.reward_currency,
          p_max_uses: codeData.max_uses ?? null,
          p_expires_at: null,
        }
      )

      if (rpcError) throw new Error(rpcError.message)
      return code
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-codes'] })
    },
  })
}

/**
 * Toggle referral code active status.
 */
export function useToggleReferralCode() {
  const queryClient = useQueryClient()
  const { tenant } = useAuth()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string
      is_active: boolean
    }) => {
      const { data, error } = await supabase
        .from('referral_codes')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenant!.id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-codes'] })
    },
  })
}
