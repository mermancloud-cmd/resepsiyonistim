import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getTenantIdFromSession } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient()
    const tenantId = await getTenantIdFromSession()
    const conversationId = (await context.params).id

    // Fetch conversation with state info
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_states (
          language,
          context,
          last_message_at
        )
      `)
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Fetch all messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (msgError) {
      console.error('Error fetching messages:', msgError)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      conversation: {
        ...conversation,
        guest_phone: maskPhone(conversation.guest_phone),
        language: conversation.conversation_states?.language || 'en',
      },
      messages,
    })
  } catch (error) {
    console.error('Error in GET /api/conversations/[id]:', error)
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
