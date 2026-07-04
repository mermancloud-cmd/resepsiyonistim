import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'

// Re-export types for components that import from this hook
export type { ConversationState } from '@/lib/types'
export type { Conversation as ConversationUI } from '@/lib/types'
export type { MessageRole } from '@/lib/types'

/** Display-level state for conversation filter tabs and badges. */
export type ConversationDisplayState = 'active' | 'closed' | 'pending' | 'taken_over'

export interface Conversation {
  id: string
  tenant_id: string
  guest_name: string | null
  guest_phone: string
  state: 'active' | 'closed' | 'pending'
  assigned_agent: string | null
  ai_enabled: boolean
  message_count: number
  last_message_at: string
  language: string
  created_at: string
  updated_at: string
  // Display-only fields (populated via joins or views)
  last_message?: string
  unread_count?: number
  bungalow_name?: string
}

/**
 * Derive the display state for a conversation.
 * When a human has taken over (assigned_agent === 'human'), the display state
 * is 'taken_over' regardless of the underlying DB state.
 */
export function getConversationDisplayState(
  conv: { state?: string; assigned_agent?: string | null }
): ConversationDisplayState {
  if (conv.assigned_agent === 'human') return 'taken_over'
  return (conv.state ?? 'active') as ConversationDisplayState
}

interface Message {
  id: string
  conversation_id: string
  sender: 'guest' | 'agent' | 'ai'
  content: string
  created_at: string
  metadata?: unknown
}

interface ConversationDetail {
  conversation: Conversation & { language: string }
  messages: Message[]
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch conversations scoped to the current tenant.
 * Uses Supabase RLS to ensure the owner only sees their own data.
 */
export function useConversations(search?: string) {
  const { tenant, isAuthenticated } = useAuth()
  const supabase = createClient()

  return useQuery<{ conversations: Conversation[]; total: number }, Error>({
    queryKey: ['conversations', search, tenant?.id],
    enabled: isAuthenticated && !!tenant,
    queryFn: async () => {
      let query = supabase
        .from('conversations')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenant!.id)
        .order('last_message_at', { ascending: false })

      if (search) {
        query = query.or(
          `guest_name.ilike.%${search}%,guest_phone.ilike.%${search}%`
        )
      }

      const { data, error, count } = await query
      if (error) throw new Error(error.message)

      return {
        conversations: (data ?? []) as unknown as Conversation[],
        total: count ?? 0,
      }
    },
    staleTime: 10 * 1000,
  })
}

export function useConversation(id: string) {
  const { tenant, isAuthenticated } = useAuth()
  const supabase = createClient()

  return useQuery<ConversationDetail, Error>({
    queryKey: ['conversation', id, tenant?.id],
    enabled: isAuthenticated && !!tenant && !!id,
    queryFn: async () => {
      // Fetch conversation (tenant-scoped via RLS)
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenant!.id)
        .single()

      if (convError) throw new Error(convError.message)

      // Fetch messages for this conversation
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .eq('tenant_id', tenant!.id)
        .order('created_at', { ascending: true })

      if (msgError) throw new Error(msgError.message)

      return {
        conversation: conversation as unknown as Conversation & { language: string },
        messages: (messages ?? []) as unknown as Message[],
      }
    },
    staleTime: 5 * 1000,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useHandoff() {
  const queryClient = useQueryClient()
  const { tenant } = useAuth()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      conversationId,
      action
    }: {
      conversationId: string
      action: 'takeover' | 'return_to_ai'
    }) => {
      const assignedAgent = action === 'takeover' ? 'human' : 'ai'
      const aiEnabled = action !== 'takeover'

      const { data, error } = await supabase
        .from('conversations')
        .update({
          assigned_agent: assignedAgent,
          ai_enabled: aiEnabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .eq('tenant_id', tenant!.id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversation'] })
    },
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  const { tenant } = useAuth()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
    }: {
      conversationId: string
      content: string
    }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender: 'agent' as const,
          content,
          metadata: null,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as unknown as Message
    },
    onMutate: async ({ conversationId, content }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['conversation', conversationId] })

      // Snapshot previous cache for rollback
      const previous = queryClient.getQueryData<ConversationDetail>([
        'conversation',
        conversationId,
        tenant?.id,
      ])

      // Optimistically append the new message
      if (previous) {
        const optimisticMessage: Message = {
          id: `optimistic-${Date.now()}`,
          conversation_id: conversationId,
          sender: 'agent',
          content,
          created_at: new Date().toISOString(),
          metadata: null,
        }

        queryClient.setQueryData<ConversationDetail>(
          ['conversation', conversationId, tenant?.id],
          {
            ...previous,
            messages: [...previous.messages, optimisticMessage],
          }
        )
      }

      return { previous }
    },
    onError: (_err, { conversationId }, context) => {
      // Rollback to the previous cache snapshot
      if (context?.previous) {
        queryClient.setQueryData(
          ['conversation', conversationId, tenant?.id],
          context.previous
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation'] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}
