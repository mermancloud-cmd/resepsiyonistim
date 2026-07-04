import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getTenantIdFromSession } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient()
    const tenantId = await getTenantIdFromSession()
    const reservationId = (await context.params).id
    const body = await request.json()

    const { action, notes } = body
    if (!action || !['confirm', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "confirm" or "reject"' },
        { status: 400 }
      )
    }

    // Verify reservation belongs to tenant
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    const paymentStatus = action === 'confirm' ? 'confirmed' : 'rejected'

    const { data: updated, error } = await supabase
      .from('reservations')
      .update({
        payment_status: paymentStatus,
        payment_notes: notes || null,
      })
      .eq('id', reservationId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating payment status:', error)
      return NextResponse.json(
        { error: 'Failed to update payment status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reservation: updated })
  } catch (error) {
    console.error('Error in POST /api/reservations/[id]/payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  }
}
