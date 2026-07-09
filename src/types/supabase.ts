export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string
          tenant_id: string
          guest_phone: string
          guest_name: string | null
          state: 'active' | 'closed' | 'pending'
          assigned_agent: string | null
          ai_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>
      }
      conversation_states: {
        Row: {
          conversation_id: string
          language: string
          context: Json
          last_message_at: string
        }
        Insert: Database['public']['Tables']['conversation_states']['Row']
        Update: Partial<Database['public']['Tables']['conversation_states']['Insert']>
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender: 'guest' | 'agent' | 'ai'
          content: string
          created_at: string
          metadata: Json | null
        }
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
      }
      reservations: {
        Row: {
          id: string
          tenant_id: string
          guest_name: string
          guest_email: string
          guest_phone: string | null
          room_id: string
          check_in_date: string
          check_out_date: string
          status: 'pending' | 'confirmed' | 'rejected' | 'cancelled'
          total_amount: number
          payment_method: string | null
          payment_status: 'pending' | 'confirmed' | 'rejected'
          payment_notes: string | null
          iban_last4: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['reservations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['reservations']['Insert']>
      }
      rooms: {
        Row: {
          id: string
          tenant_id: string
          room_number: string
          room_type: string
          capacity: number
          price_per_night: number
          status: 'available' | 'occupied' | 'maintenance'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['rooms']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['rooms']['Insert']>
      }
      tenant_settings: {
        Row: {
          tenant_id: string
          ai_enabled: boolean
          n8n_webhook_url: string | null
          updated_at: string
        }
        Insert: Database['public']['Tables']['tenant_settings']['Row']
        Update: Partial<Database['public']['Tables']['tenant_settings']['Insert']>
      }
      user_profiles: {
        Row: {
          user_id: string
          tenant_id: string
          role: string
          created_at: string
        }
        Insert: Database['public']['Tables']['user_profiles']['Row']
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>
      }
      guest_satisfaction_surveys: {
        Row: {
          id: string
          tenant_id: string
          conversation_id: string | null
          guest_name: string | null
          guest_phone: string | null
          rating: number
          feedback_text: string | null
          category_tags: string[]
          submitted_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['guest_satisfaction_surveys']['Row'], 'id' | 'created_at' | 'submitted_at'>
        Update: Partial<Database['public']['Tables']['guest_satisfaction_surveys']['Insert']>
      }
      referrals: {
        Row: {
          id: string
          tenant_id: string
          referrer_name: string
          referrer_phone: string
          referee_name: string | null
          referee_phone: string | null
          referee_email: string | null
          status: 'pending' | 'converted' | 'rewarded' | 'expired'
          reward_type: 'discount' | 'credit' | 'free_night' | 'cash'
          reward_amount: number
          reward_currency: string
          reward_claimed_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['referrals']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['referrals']['Insert']>
      }
      ab_tests: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          variant_a_name: string
          variant_b_name: string
          target_metric: 'satisfaction_score' | 'completion_rate' | 'response_time' | 'conversion_rate'
          is_active: boolean
          start_at: string | null
          end_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['ab_tests']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['ab_tests']['Insert']>
      }
      ab_test_results: {
        Row: {
          id: string
          test_id: string
          tenant_id: string
          conversation_id: string | null
          variant: 'control' | 'treatment'
          satisfaction_score: number | null
          completion_rate: number | null
          response_time_seconds: number | null
          message_count: number | null
          was_handoff: boolean
          converted: boolean
          metadata: Json
          recorded_at: string
        }
        Insert: Omit<Database['public']['Tables']['ab_test_results']['Row'], 'id' | 'recorded_at'>
        Update: Partial<Database['public']['Tables']['ab_test_results']['Insert']>
      }
      referral_codes: {
        Row: {
          id: string
          tenant_id: string
          code: string
          description: string | null
          is_active: boolean
          max_uses: number | null
          current_uses: number
          reward_type: 'discount' | 'credit' | 'free_night' | 'cash'
          reward_amount: number
          reward_currency: string
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['referral_codes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['referral_codes']['Insert']>
      }
      humanization_test_scenarios: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          category: 'general' | 'greeting' | 'empathy' | 'objection_handling' | 'room_presentation' | 'followup' | 'closing' | 'complaint'
          prompt_template: string | null
          expected_behaviors: string[]
          evaluation_criteria: Json
          min_target_score: number
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['humanization_test_scenarios']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['humanization_test_scenarios']['Insert']>
      }
      humanization_scores: {
        Row: {
          id: string
          tenant_id: string
          scenario_id: string
          conversation_id: string | null
          ai_response_text: string
          score_naturalness: number | null
          score_empathy: number | null
          score_fluency: number | null
          score_context: number | null
          score_personalization: number | null
          score_flow: number | null
          score_tone: number | null
          composite_score: number | null
          evaluation_method: 'manual' | 'automated' | 'llm_judge'
          evaluator_id: string | null
          notes: string | null
          passed: boolean | null
          metadata: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['humanization_scores']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['humanization_scores']['Insert']>
      }
    }
  }
}
