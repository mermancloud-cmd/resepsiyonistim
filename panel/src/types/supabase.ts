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
    }
  }
}
