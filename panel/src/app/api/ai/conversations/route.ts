import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getTenantIdFromSession } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const tenantId = await getTenantIdFromSession()

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        id,
        guest_name,
        guest_phone,
        state,
        ai_enabled,
        assigned_agent,
        created_at,
        updated_at,
        conversation_states (
          language,
          last_message_at
        )
      `)
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching AI conversations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      )
    }

    // Get global AI setting
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('ai_enabled')
      .eq('tenant_id', tenantId)
      .single()

    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      guest_name: conv.guest_name,
      guest_phone: maskPhone(conv.guest_phone),
      state: conv.state,
      handler: conv.ai_enabled && !conv.assigned_agent ? 'ai' : 'human',
      assigned_agent: conv.assigned_agent,
      ai_enabled: conv.ai_enabled,
      language: (conv.conversation_states as any)?.[0]?.language || 'tr',
      last_active: (conv.conversation_states as any)?.[0]?.last_message_at || conv.updated_at,
      created_at: conv.created_at,
    }))

    return NextResponse.json({
      conversations: formattedConversations,
      global_ai_enabled: settings?.ai_enabled ?? true,
    })
  } catch (error) {
    console.error('Error in GET /api/ai/conversations:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  }
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return phone
  return '***' + phone.slice(-4)
}
