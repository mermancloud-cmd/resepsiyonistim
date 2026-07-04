import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getTenantIdFromSession } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const tenantId = await getTenantIdFromSession()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
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
      .eq('tenant_id', tenantId)
      .order('check_in_date', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: reservations, error } = await query

    if (error) {
      console.error('Error fetching reservations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reservations' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reservations })
  } catch (error) {
    console.error('Error in GET /api/reservations:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const tenantId = await getTenantIdFromSession()
    const body = await request.json()

    const {
      guest_name,
      guest_email,
      guest_phone,
      room_id,
      check_in_date,
      check_out_date,
      total_amount,
      payment_method,
    } = body

    if (!guest_name || !guest_email || !room_id || !check_in_date || !check_out_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: reservation, error } = await supabase
      .from('reservations')
      .insert({
        tenant_id: tenantId,
        guest_name,
        guest_email,
        guest_phone: guest_phone || null,
        room_id,
        check_in_date,
        check_out_date,
        total_amount: total_amount || 0,
        payment_method: payment_method || null,
        status: 'pending',
        payment_status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating reservation:', error)
      return NextResponse.json(
        { error: 'Failed to create reservation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reservation }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/reservations:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  }
}
