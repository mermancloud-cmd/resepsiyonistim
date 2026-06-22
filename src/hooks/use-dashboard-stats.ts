import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'

interface DashboardStats {
  check_ins_today: number
  check_outs_today: number
  occupancy_rate: number
  pending_actions: number
  revenue_today: number
  active_conversations: number
  ai_enabled: boolean
  // Component display fields
  checkInsToday?: number
  checkOutsToday?: number
  occupancyRate?: number
  pendingActions?: number
  aiStatus?: string
  aiMessagesHandled?: number
  aiLastActivity?: string
  weeklyRevenue?: { day: string; revenue: number }[]
}

/**
 * Fetch dashboard stats scoped to the current tenant.
 * Aggregates data from reservations, conversations, and AI settings.
 * All queries are tenant-scoped via RLS.
 */
export function useDashboardStats() {
  const { tenant, isAuthenticated } = useAuth()
  const supabase = createClient()

  return useQuery<DashboardStats, Error>({
    queryKey: ['dashboard-stats', tenant?.id],
    enabled: isAuthenticated && !!tenant,
    queryFn: async () => {
      const tenantId = tenant!.id
      const today = new Date().toISOString().split('T')[0]

      // Parallel queries for dashboard stats
      const [
        checkInsResult,
        checkOutsResult,
        pendingResult,
        revenueResult,
        conversationsResult,
        aiSettingsResult,
      ] = await Promise.all([
        // Check-ins today
        supabase
          .from('reservations')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('check_in_date', today)
          .eq('status', 'confirmed'),

        // Check-outs today
        supabase
          .from('reservations')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('check_out_date', today)
          .eq('status', 'confirmed'),

        // Pending actions (reservations needing attention)
        supabase
          .from('reservations')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .or('status.eq.pending,payment_status.eq.pending'),

        // Revenue today (confirmed payments)
        supabase
          .from('reservations')
          .select('total_amount')
          .eq('tenant_id', tenantId)
          .eq('payment_status', 'confirmed')
          .gte('created_at', today),

        // Active conversations
        supabase
          .from('conversations')
          .select('id, ai_enabled', { count: 'exact' })
          .eq('tenant_id', tenantId)
          .eq('state', 'active'),

        // AI settings
        supabase
          .from('ai_settings')
          .select('enabled')
          .eq('tenant_id', tenantId)
          .maybeSingle(),
      ])

      const revenue = (revenueResult.data ?? []).reduce(
        (sum, r) => sum + (r.total_amount || 0),
        0
      )

      const activeConversations = conversationsResult.count ?? 0
      const aiEnabledCount = (conversationsResult.data ?? []).filter(
        (c) => c.ai_enabled
      ).length

      return {
        check_ins_today: checkInsResult.count ?? 0,
        check_outs_today: checkOutsResult.count ?? 0,
        occupancy_rate: 0, // Requires room count from properties table
        pending_actions: pendingResult.count ?? 0,
        revenue_today: revenue,
        active_conversations: activeConversations,
        ai_enabled: aiSettingsResult.data?.enabled ?? false,
        // Component display fields
        checkInsToday: checkInsResult.count ?? 0,
        checkOutsToday: checkOutsResult.count ?? 0,
        occupancyRate: 0,
        pendingActions: pendingResult.count ?? 0,
        aiStatus: aiEnabledCount > 0 ? 'active' : 'inactive',
        aiMessagesHandled: aiEnabledCount,
      }
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}
