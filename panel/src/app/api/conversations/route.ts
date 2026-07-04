import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getTenantIdFromSession } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const tenantId = await getTenantIdFromSession()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    let query = supabase
      .from('conversations')
      .select(`
        *,
        conversation_states (
          language,
          last_message_at
        )
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })

    if (search) {
      query = query.or(`guest_name.ilike.%${search}%,guest_phone.ilike.%${search}%`)
    }

    const { data: conversations, error, count } = await query

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      )
    }

    // Get message counts and format response
    const conversationIds = conversations.map(c => c.id)
    const { data: messageCounts } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)

    const messageCountMap = messageCounts?.reduce((acc, msg) => {
      acc[msg.conversation_id] = (acc[msg.conversation_id] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      guest_name: conv.guest_name,
      guest_phone: maskPhone(conv.guest_phone),
      state: conv.state,
      assigned_agent: conv.assigned_agent,
      ai_enabled: conv.ai_enabled,
      message_count: messageCountMap[conv.id] || 0,
      last_message_at: conv.conversation_states?.last_message_at || conv.updated_at,
      language: conv.conversation_states?.language || 'en',
      created_at: conv.created_at,
      updated_at: conv.updated_at,
    }))

    return NextResponse.json({
      conversations: formattedConversations,
      total: count,
    })
  } catch (error) {
    console.error('Error in GET /api/conversations:', error)
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
