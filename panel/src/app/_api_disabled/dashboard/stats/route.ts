import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getTenantIdFromSession } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const tenantId = await getTenantIdFromSession()
    const today = new Date().toISOString().split('T')[0]

    // Parallel queries for performance
    const [
      { count: checkInsCount },
      { count: checkOutsCount },
      { count: activeReservationsCount },
      { count: totalRoomsCount },
      { count: pendingActionsCount },
      { data: revenueData },
      { count: activeConversationsCount },
      { data: aiSettings },
    ] = await Promise.all([
      // Today's check-ins
      supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('check_in_date', today)
        .in('status', ['confirmed', 'pending']),

      // Today's check-outs
      supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('check_out_date', today)
        .eq('status', 'confirmed'),

      // Active reservations (occupancy)
      supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'confirmed')
        .lte('check_in_date', today)
        .gte('check_out_date', today),

      // Total rooms
      supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),

      // Pending actions (pending reservations + pending payments)
      supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .or('status.eq.pending,payment_status.eq.pending'),

      // Revenue today (confirmed reservations checking in today)
      supabase
        .from('reservations')
        .select('total_amount')
        .eq('tenant_id', tenantId)
        .eq('check_in_date', today)
        .eq('status', 'confirmed')
        .eq('payment_status', 'confirmed'),

      // Active conversations
      supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('state', 'active'),

      // AI settings
      supabase
        .from('tenant_settings')
        .select('ai_enabled')
        .eq('tenant_id', tenantId)
        .single(),
    ])

    const totalRooms = totalRoomsCount || 1
    const occupancyRate = Math.round(((activeReservationsCount || 0) / totalRooms) * 100)
    const revenueToday = (revenueData || []).reduce((sum, r) => sum + (r.total_amount || 0), 0)

    return NextResponse.json({
      stats: {
        check_ins_today: checkInsCount || 0,
        check_outs_today: checkOutsCount || 0,
        occupancy_rate: occupancyRate,
        pending_actions: pendingActionsCount || 0,
        revenue_today: revenueToday,
        active_conversations: activeConversationsCount || 0,
        ai_enabled: aiSettings?.ai_enabled ?? true,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/dashboard/stats:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  }
}
