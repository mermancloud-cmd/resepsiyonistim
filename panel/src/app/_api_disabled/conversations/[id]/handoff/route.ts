import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getTenantIdFromSession } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient()
    const tenantId = await getTenantIdFromSession()
    const conversationId = (await context.params).id
    const body = await request.json()

    const { action } = body
    if (!action || !['takeover', 'return_to_ai'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "takeover" or "return_to_ai"' },
        { status: 400 }
      )
    }

    // Verify conversation belongs to tenant
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Get user info for assigned_agent
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Update conversation
    const updates = action === 'takeover' 
      ? { assigned_agent: user.id, ai_enabled: false }
      : { assigned_agent: null, ai_enabled: true }

    const { error: updateError } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)

    if (updateError) {
      console.error('Error updating conversation:', updateError)
      return NextResponse.json(
        { error: 'Failed to update conversation' },
        { status: 500 }
      )
    }

    // Call n8n webhook if configured
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('n8n_webhook_url')
      .eq('tenant_id', tenantId)
      .single()

    if (settings?.n8n_webhook_url) {
      try {
        await fetch(settings.n8n_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflow: action === 'takeover' ? 'handoff-takeover' : 'handoff-return',
            conversation_id: conversationId,
            tenant_id: tenantId,
            agent_id: user.id,
            timestamp: new Date().toISOString(),
          }),
        })
      } catch (webhookError) {
        console.error('Failed to call n8n webhook:', webhookError)
        // Don't fail the request if webhook fails
      }
    }

    return NextResponse.json({
      success: true,
      conversation: {
        ...conversation,
        ...updates,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/conversations/[id]/handoff:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    )
  }
}
