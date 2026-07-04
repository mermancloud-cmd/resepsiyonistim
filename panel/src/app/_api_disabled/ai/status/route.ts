import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getTenantIdFromSession } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const tenantId = await getTenantIdFromSession()

    const { data: settings, error } = await supabase
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      // If no settings exist yet, create default
      if (error.code === 'PGRST116') {
        const { data: newSettings, error: insertError } = await supabase
          .from('tenant_settings')
          .insert({
            tenant_id: tenantId,
            ai_enabled: true,
          })
          .select()
          .single()

        if (insertError) {
          return NextResponse.json(
            { error: 'Failed to create tenant settings' },
            { status: 500 }
          )
        }

        return NextResponse.json({ settings: newSettings })
      }

      return NextResponse.json(
        { error: 'Failed to fetch AI settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error in GET /api/ai/status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const tenantId = await getTenantIdFromSession()
    const body = await request.json()

    const { ai_enabled } = body
    if (typeof ai_enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'ai_enabled must be a boolean' },
        { status: 400 }
      )
    }

    const { data: settings, error } = await supabase
      .from('tenant_settings')
      .upsert({
        tenant_id: tenantId,
        ai_enabled,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating AI settings:', error)
      return NextResponse.json(
        { error: 'Failed to update AI status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error in PATCH /api/ai/status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  }
}
