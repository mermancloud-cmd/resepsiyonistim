import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import type { ABTest, ABTestResult, ABTestSummary, ABTestWinnerHistoryRow } from '@/lib/types'

// ─── Mock Data ──────────────────────────────────────────────────────────────

export const mockABTests: ABTest[] = [
  {
    id: 'ab-test-1',
    tenant_id: 'default',
    name: 'Persona Tonu A/B Testi',
    description: 'Resmi vs samimi dil kullanımının memnuniyet üzerindeki etkisi',
    variant_a_name: 'Resmi',
    variant_b_name: 'Samimi',
    target_metric: 'satisfaction_score',
    is_active: true,
    start_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    end_at: null,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ab-test-2',
    tenant_id: 'default',
    name: 'Açılış Mesajı Testi',
    description: 'Kısa vs detaylı açılış mesajının dönüşüme etkisi',
    variant_a_name: 'Kısa',
    variant_b_name: 'Detaylı',
    target_metric: 'conversion_rate',
    is_active: false,
    start_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    end_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
]

export const mockABTestSummaries: ABTestSummary[] = [
  { variant: 'control', total_count: 45, avg_satisfaction: 3.8, avg_completion_rate: 72.4, avg_response_time: 145, handoff_rate: 18.5, conversion_rate: 22.3 },
  { variant: 'treatment', total_count: 48, avg_satisfaction: 4.2, avg_completion_rate: 81.6, avg_response_time: 112, handoff_rate: 12.8, conversion_rate: 31.5 },
]

export const mockABTestResults: ABTestResult[] = [
  {
    id: 'res-1', test_id: 'ab-test-1', tenant_id: 'default', conversation_id: 'conv-001',
    variant: 'control', satisfaction_score: 3.5, completion_rate: 70.0, response_time_seconds: 180,
    message_count: 12, was_handoff: false, converted: true, metadata: {}, recorded_at: new Date().toISOString(),
  },
  {
    id: 'res-2', test_id: 'ab-test-1', tenant_id: 'default', conversation_id: 'conv-002',
    variant: 'treatment', satisfaction_score: 4.5, completion_rate: 90.0, response_time_seconds: 90,
    message_count: 15, was_handoff: false, converted: true, metadata: {}, recorded_at: new Date().toISOString(),
  },
  {
    id: 'res-3', test_id: 'ab-test-1', tenant_id: 'default', conversation_id: 'conv-003',
    variant: 'control', satisfaction_score: 2.5, completion_rate: 45.0, response_time_seconds: 300,
    message_count: 6, was_handoff: true, converted: false, metadata: {}, recorded_at: new Date().toISOString(),
  },
]

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Fetch all A/B tests for the current tenant.
 */
export function useABTests() {
  const { tenant, isAuthenticated } = useAuth()
  const supabase = createClient()

  return useQuery<ABTest[], Error>({
    queryKey: ['ab-tests', tenant?.id],
    enabled: isAuthenticated && !!tenant,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ab_tests')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      return (data ?? []) as ABTest[]
    },
    staleTime: 10 * 1000,
  })
}

/**
 * Fetch summary (aggregated stats) for a specific A/B test.
 */
export function useABTestSummary(testId: string | undefined) {
  const { tenant, isAuthenticated } = useAuth()
  const supabase = createClient()

  return useQuery<ABTestSummary[], Error>({
    queryKey: ['ab-test-summary', testId, tenant?.id],
    enabled: isAuthenticated && !!tenant && !!testId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ab_test_results')
        .select('variant, satisfaction_score, completion_rate, response_time_seconds, was_handoff, converted')
        .eq('test_id', testId!)
        .eq('tenant_id', tenant!.id)

      if (error) throw new Error(error.message)

      const rows = data ?? []
      const grouped: Record<string, ABTestSummary> = {}

      for (const row of rows) {
        if (!grouped[row.variant]) {
          grouped[row.variant] = {
            variant: row.variant,
            total_count: 0,
            avg_satisfaction: 0,
            avg_completion_rate: 0,
            avg_response_time: 0,
            handoff_rate: 0,
            conversion_rate: 0,
          }
        }
        const g = grouped[row.variant]
        g.total_count++
        g.avg_satisfaction = row.satisfaction_score != null
          ? Number((((g.avg_satisfaction ?? 0) * (g.total_count - 1) + row.satisfaction_score) / g.total_count).toFixed(2))
          : g.avg_satisfaction
        g.avg_completion_rate = row.completion_rate != null
          ? Number((((g.avg_completion_rate ?? 0) * (g.total_count - 1) + row.completion_rate) / g.total_count).toFixed(2))
          : g.avg_completion_rate
        g.avg_response_time = row.response_time_seconds != null
          ? Math.round(((g.avg_response_time ?? 0) * (g.total_count - 1) + row.response_time_seconds) / g.total_count)
          : g.avg_response_time
        if (row.was_handoff) g.handoff_rate = ((g.handoff_rate ?? 0) * (g.total_count - 1) + 1) / g.total_count * 100
        if (row.converted) g.conversion_rate = ((g.conversion_rate ?? 0) * (g.total_count - 1) + 1) / g.total_count * 100
      }

      return Object.values(grouped).map(g => ({
        ...g,
        handoff_rate: g.handoff_rate != null ? Number(g.handoff_rate.toFixed(1)) : null,
        conversion_rate: g.conversion_rate != null ? Number(g.conversion_rate.toFixed(1)) : null,
      }))
    },
    staleTime: 10 * 1000,
  })
}

/**
 * Fetch raw results for a specific A/B test.
 */
export function useABTestResults(testId: string | undefined) {
  const { tenant, isAuthenticated } = useAuth()
  const supabase = createClient()

  return useQuery<ABTestResult[], Error>({
    queryKey: ['ab-test-results', testId, tenant?.id],
    enabled: isAuthenticated && !!tenant && !!testId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ab_test_results')
        .select('*')
        .eq('test_id', testId!)
        .eq('tenant_id', tenant!.id)
        .order('recorded_at', { ascending: false })
        .limit(100)

      if (error) throw new Error(error.message)
      return (data ?? []) as ABTestResult[]
    },
    staleTime: 10 * 1000,
  })
}

/**
 * Create a new A/B test.
 */
export function useCreateABTest() {
  const queryClient = useQueryClient()
  const { tenant } = useAuth()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (testData: {
      name: string
      description?: string
      variant_a_name: string
      variant_b_name: string
      target_metric: ABTest['target_metric']
      start_at?: string
      end_at?: string
    }) => {
      const { data, error } = await supabase
        .from('ab_tests')
        .insert({
          tenant_id: tenant!.id,
          name: testData.name,
          description: testData.description ?? null,
          variant_a_name: testData.variant_a_name,
          variant_b_name: testData.variant_b_name,
          target_metric: testData.target_metric,
          start_at: testData.start_at ?? null,
          end_at: testData.end_at ?? null,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] })
    },
  })
}

/**
 * Toggle A/B test active status.
 */
export function useToggleABTest() {
  const queryClient = useQueryClient()
  const { tenant } = useAuth()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('ab_tests')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenant!.id)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] })
    },
  })
}

/**
 * Record an A/B test result.
 */
export function useRecordABTestResult() {
  const queryClient = useQueryClient()
  const { tenant } = useAuth()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (resultData: {
      test_id: string
      variant: 'control' | 'treatment'
      conversation_id?: string
      satisfaction_score?: number
      completion_rate?: number
      response_time_seconds?: number
      message_count?: number
      was_handoff?: boolean
      converted?: boolean
    }) => {
      const { data, error } = await supabase
        .from('ab_test_results')
        .insert({
          test_id: resultData.test_id,
          tenant_id: tenant!.id,
          conversation_id: resultData.conversation_id ?? null,
          variant: resultData.variant,
          satisfaction_score: resultData.satisfaction_score ?? null,
          completion_rate: resultData.completion_rate ?? null,
          response_time_seconds: resultData.response_time_seconds ?? null,
          message_count: resultData.message_count ?? null,
          was_handoff: resultData.was_handoff ?? false,
          converted: resultData.converted ?? false,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ab-test-summary', variables.test_id] })
      queryClient.invalidateQueries({ queryKey: ['ab-test-results', variables.test_id] })
    },
  })
}

/**
 * Assign a random variant for a given conversation.
 * Returns the assign_ab_test_variant RPC result or 'control' as default.
 */
export function useAssignVariant(conversationId?: string) {
  const { tenant } = useAuth()
  const supabase = createClient()

  return useQuery<string | null, Error>({
    queryKey: ['ab-variant', conversationId, tenant?.id],
    enabled: !!tenant && !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('assign_ab_test_variant', {
        p_tenant_id: tenant!.id,
        p_conversation_id: conversationId ?? null,
      })

      if (error) {
        // Fallback: check if there's any active test
        const { data: activeTests } = await supabase
          .from('ab_tests')
          .select('id')
          .eq('tenant_id', tenant!.id)
          .eq('is_active', true)
          .limit(1)

        if (!activeTests?.length) return null

        // Return null to signal no active test context, code will default
        return null
      }

      return data as string | null
    },
    staleTime: Infinity, // Don't re-fetch — variant is sticky per conversation
  })
}

// ─── I5(v4) Optimization Pipeline Hooks ──────────────────────────────────────

/**
 * useABTestOptimization — run auto-optimization for a specific test.
 * Calls GET /api/ab-test/auto-optimize?test_id=...
 */
export function useABTestOptimization() {
  return useMutation({
    mutationFn: async ({
      testId,
    }: {
      testId: string;
    }) => {
      const res = await fetch(
        `/api/ab-test/auto-optimize?test_id=${testId}`,
        {
          headers: {
            authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}`,
          },
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Optimizasyon hatası" }));
        throw new Error(err.error || "Optimizasyon başarısız");
      }

      return res.json();
    },
  })
}

/**
 * useApplyABTestWinner — manually apply a winner variant to a test.
 * Uses the auto-optimize endpoint with a specific test_id.
 */
export function useApplyABTestWinner() {
  const queryClient = useQueryClient()
  const { tenant } = useAuth()

  return useMutation({
    mutationFn: async ({
      testId,
      winnerVariantId,
    }: {
      testId: string;
      winnerVariantId: string;
    }) => {
      const supabase = createClient()

      // Update the variant's winning_variant_id and trigger_type
      const { error: variantError } = await supabase
        .from("ab_test_variants")
        .update({
          winning_variant_id: winnerVariantId,
          trigger_type: "manual",
          updated_at: new Date().toISOString(),
        })
        .eq("id", winnerVariantId)
        .eq("test_id", testId)

      if (variantError) throw new Error(variantError.message)

      // Deactivate the test
      const { error: testError } = await supabase
        .from("ab_tests")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", testId)
        .eq("tenant_id", tenant!.id)

      if (testError) throw new Error(testError.message)

      // Record the optimization
      const { data: optData, error: optError } = await supabase
        .from("ab_test_optimizations")
        .insert({
          test_id: testId,
          tenant_id: tenant!.id,
          winner_variant_id: winnerVariantId,
          sample_size: 0,
          status: "completed",
          triggered_by: "manual",
          applied_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (optError) throw new Error(optError.message)

      return optData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ab-tests"] })
      queryClient.invalidateQueries({ queryKey: ["ab-test-winner-history"] })
    },
  })
}

/**
 * useABTestWinnerHistory — fetch past optimization history.
 */
export function useABTestWinnerHistory() {
  const { tenant, isAuthenticated } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ["ab-test-winner-history", tenant?.id],
    enabled: isAuthenticated && !!tenant,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ab_test_winner_history")
        .select("*")
        .limit(50)

      if (error) {
        // Fallback: query optimizations table directly
        const { data: fallback, error: fallbackError } = await supabase
          .from("ab_test_optimizations")
          .select(`
            id,
            test_id,
            status,
            confidence_score,
            sample_size,
            triggered_by,
            applied_at,
            created_at,
            ab_tests!inner(name, target_metric)
          `)
          .eq("test_id.tenant_id", tenant!.id)
          .order("created_at", { ascending: false })
          .limit(50)

        if (fallbackError) throw new Error(fallbackError.message)

        return (fallback ?? []).map((r: Record<string, unknown>) => ({
          id: r.id,
          test_id: r.test_id,
          test_name: (r as any).ab_tests?.name ?? "—",
          winning_metric: (r as any).ab_tests?.target_metric ?? "—",
          metric_improvement: null,
          confidence_score: r.confidence_score,
          sample_size: r.sample_size,
          status: r.status ?? "completed",
          triggered_by: r.triggered_by,
          applied_at: r.applied_at,
          created_at: r.created_at,
        }))
      }

      return (data ?? []) as ABTestWinnerHistoryRow[]
    },
    staleTime: 30 * 1000,
  })
}
