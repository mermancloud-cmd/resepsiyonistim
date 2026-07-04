import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getTenantIdFromSession } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient()
    const tenantId = await getTenantIdFromSession()
    const reservationId = (await context.params).id

    const { data: reservation, error } = await supabase
      .from('reservations')
      .select(`
        *,
        rooms (
          room_number,
          room_type,
          capacity,
          price_per_night
        )
      `)
      .eq('id', reservationId)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ reservation })
  } catch (error) {
    console.error('Error in GET /api/reservations/[id]:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient()
    const tenantId = await getTenantIdFromSession()
    const reservationId = (await context.params).id
    const body = await request.json()

    const { status } = body
    if (!status || !['confirmed', 'rejected', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "confirmed", "rejected", or "cancelled"' },
        { status: 400 }
      )
    }

    // Verify reservation belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }

    const { data: reservation, error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', reservationId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating reservation:', error)
      return NextResponse.json(
        { error: 'Failed to update reservation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reservation })
  } catch (error) {
    console.error('Error in PATCH /api/reservations/[id]:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  }
}
