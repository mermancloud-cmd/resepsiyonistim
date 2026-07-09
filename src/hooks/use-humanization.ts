import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import type {
  HumanizationScenario,
  HumanizationScore,
  HumanizationSummary,
  HumanizationScenarioStats,
  HumanizationCategory,
} from '@/lib/types'

// ─── Mock Data (fallback when DB not available) ─────────────────────────────

export const mockScenarios: HumanizationScenario[] = [
  {
    id: 'scenario-1',
    tenant_id: 'default',
    name: 'Doğal Karşılama',
    description: 'Misafirin ilk mesajına doğal ve sıcak bir karşılama verme',
    category: 'greeting',
    prompt_template: 'Bir misafir size "Merhaba, 2 kişilik bir bungalov arıyorum 3 gece için" yazdı. Yanıt verin.',
    expected_behaviors: ['Sıcak selamlama', 'Kendini tanıtma', 'Kişisel dokunuş'],
    evaluation_criteria: [
      { name: 'doğallık', weight: 0.25, max_score: 100 },
      { name: 'empati', weight: 0.20, max_score: 100 },
      { name: 'akış', weight: 0.20, max_score: 100 },
      { name: 'ton', weight: 0.20, max_score: 100 },
      { name: 'kişiselleştirme', weight: 0.15, max_score: 100 },
    ],
    min_target_score: 95,
    is_active: true,
    sort_order: 1,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'scenario-2',
    tenant_id: 'default',
    name: 'Empatik Yanıt',
    description: 'Misafirin şikayet veya endişesine empatik yanıt verme',
    category: 'empathy',
    prompt_template: null,
    expected_behaviors: ['Anlayış gösterme', 'Özür dileme', 'Çözüm odaklı'],
    evaluation_criteria: [
      { name: 'empati', weight: 0.35, max_score: 100 },
      { name: 'doğallık', weight: 0.20, max_score: 100 },
      { name: 'ton', weight: 0.25, max_score: 100 },
      { name: 'akış', weight: 0.20, max_score: 100 },
    ],
    min_target_score: 95,
    is_active: true,
    sort_order: 2,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const mockSummary: HumanizationSummary = {
  total_evaluations: 128,
  passed_count: 105,
  fail_count: 23,
  pass_rate: 82.03,
  avg_composite: 87.4,
  avg_naturalness: 89.2,
  avg_empathy: 84.6,
  avg_fluency: 91.3,
  avg_context: 86.7,
  avg_personalization: 82.1,
  avg_flow: 88.9,
  avg_tone: 90.5,
  best_score: 98.7,
  worst_score: 62.3,
  scenario_count: 7,
  last_evaluated_at: new Date().toISOString(),
}

export const mockScenarioStats: HumanizationScenarioStats[] = [
  { scenario_id: 'scenario-1', scenario_name: 'Doğal Karşılama', category: 'greeting', total_evaluations: 22, passed_count: 19, avg_composite: 91.2, avg_naturalness: 93.5, avg_empathy: 89.0, avg_fluency: 94.1, avg_context: 90.2, avg_personalization: 88.3, avg_flow: 91.7, avg_tone: 92.8, min_target: 95, last_score: 94.2, trend: 'improving' },
  { scenario_id: 'scenario-2', scenario_name: 'Empatik Yanıt', category: 'empathy', total_evaluations: 18, passed_count: 12, avg_composite: 83.5, avg_naturalness: 85.2, avg_empathy: 79.8, avg_fluency: 88.1, avg_context: 82.4, avg_personalization: 80.1, avg_flow: 84.6, avg_tone: 86.3, min_target: 95, last_score: 87.1, trend: 'declining' },
  { scenario_id: 'scenario-3', scenario_name: 'Oda Tanıtımı', category: 'room_presentation', total_evaluations: 25, passed_count: 22, avg_composite: 92.8, avg_naturalness: 94.1, avg_empathy: 90.5, avg_fluency: 95.2, avg_context: 93.0, avg_personalization: 91.4, avg_flow: 93.6, avg_tone: 94.3, min_target: 95, last_score: 96.5, trend: 'improving' },
]

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Fetch all active humanization test scenarios for the current tenant.
 */
export function useHumanizationScenarios() {
  const { tenant, isAuthenticated } = useAuth()
  const supabase = createClient()

  return useQuery<HumanizationScenario[], Error>({
    queryKey: ['humanization-scenarios', tenant?.id],
    enabled: isAuthenticated && !!tenant,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('humanization_test_scenarios')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw new Error(error.message)
      return (data ?? []) as HumanizationScenario[]
    },
    staleTime: 30 * 1000,
  })
}

/**
 * Fetch humanization summary stats via the RPC function.
 */
export function useHumanizationSummary(daysBack: number = 30) {
  const { tenant, isAuthenticated } = useAuth()
  const supabase = createClient()

  return useQuery<HumanizationSummary, Error>({
    queryKey: ['humanization-summary', tenant?.id, daysBack],
    enabled: isAuthenticated && !!tenant,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_humanization_summary', {
          p_tenant_id: tenant!.id,
          p_days_back: daysBack,
        })

      if (error) throw new Error(error.message)

      // RPC returns an array; take the first row
      const row = (data ?? [])[0]
      if (!row) {
        return {
          total_evaluations: 0,
          passed_count: 0,
          fail_count: 0,
          pass_rate: 0,
          avg_composite: 0,
          avg_naturalness: 0,
          avg_empathy: 0,
          avg_fluency: 0,
          avg_context: 0,
          avg_personalization: 0,
          avg_flow: 0,
          avg_tone: 0,
          best_score: 0,
          worst_score: 0,
          scenario_count: 0,
          last_evaluated_at: null,
        }
      }
      return row as HumanizationSummary
    },
    staleTime: 30 * 1000,
  })
}

/**
 * Fetch per-scenario stats via the RPC function.
 */
export function useHumanizationScenarioStats(daysBack: number = 30) {
  const { tenant, isAuthenticated } = useAuth()
  const supabase = createClient()

  return useQuery<HumanizationScenarioStats[], Error>({
    queryKey: ['humanization-scenario-stats', tenant?.id, daysBack],
    enabled: isAuthenticated && !!tenant,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_humanization_scenario_stats', {
          p_tenant_id: tenant!.id,
          p_days_back: daysBack,
        })

      if (error) throw new Error(error.message)
      return (data ?? []) as HumanizationScenarioStats[]
    },
    staleTime: 30 * 1000,
  })
}

/**
 * Fetch raw scores for a specific scenario.
 */
export function useHumanizationScores(scenarioId: string | undefined, limit: number = 20) {
  const { tenant, isAuthenticated } = useAuth()
  const supabase = createClient()

  return useQuery<HumanizationScore[], Error>({
    queryKey: ['humanization-scores', scenarioId, tenant?.id],
    enabled: isAuthenticated && !!tenant && !!scenarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('humanization_scores')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .eq('scenario_id', scenarioId!)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw new Error(error.message)
      return (data ?? []) as HumanizationScore[]
    },
    staleTime: 10 * 1000,
  })
}

/**
 * Submit a new humanization score (manual evaluation).
 */
export function useSubmitHumanizationScore() {
  const queryClient = useQueryClient()
  const { tenant, user } = useAuth()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (scoreData: {
      scenario_id: string
      ai_response_text: string
      score_naturalness?: number
      score_empathy?: number
      score_fluency?: number
      score_context?: number
      score_personalization?: number
      score_flow?: number
      score_tone?: number
      composite_score?: number
      evaluation_method: 'manual' | 'automated' | 'llm_judge'
      notes?: string
      passed?: boolean
      conversation_id?: string
    }) => {
      const { data, error } = await supabase
        .from('humanization_scores')
        .insert({
          tenant_id: tenant!.id,
          scenario_id: scoreData.scenario_id,
          ai_response_text: scoreData.ai_response_text,
          conversation_id: scoreData.conversation_id ?? null,
          score_naturalness: scoreData.score_naturalness ?? null,
          score_empathy: scoreData.score_empathy ?? null,
          score_fluency: scoreData.score_fluency ?? null,
          score_context: scoreData.score_context ?? null,
          score_personalization: scoreData.score_personalization ?? null,
          score_flow: scoreData.score_flow ?? null,
          score_tone: scoreData.score_tone ?? null,
          composite_score: scoreData.composite_score ?? null,
          evaluation_method: scoreData.evaluation_method,
          evaluator_id: user?.id ?? 'unknown',
          notes: scoreData.notes ?? null,
          passed: scoreData.passed ?? null,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as HumanizationScore
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['humanization-summary'] })
      queryClient.invalidateQueries({ queryKey: ['humanization-scenario-stats'] })
      queryClient.invalidateQueries({ queryKey: ['humanization-scores'] })
    },
  })
}

/**
 * Update an existing humanization score (e.g. re-evaluate).
 */
export function useUpdateHumanizationScore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string
      score_naturalness?: number
      score_empathy?: number
      score_fluency?: number
      score_context?: number
      score_personalization?: number
      score_flow?: number
      score_tone?: number
      composite_score?: number
      notes?: string
      passed?: boolean
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('humanization_scores')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data as HumanizationScore
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['humanization-summary'] })
      queryClient.invalidateQueries({ queryKey: ['humanization-scenario-stats'] })
      queryClient.invalidateQueries({ queryKey: ['humanization-scores'] })
    },
  })
}
