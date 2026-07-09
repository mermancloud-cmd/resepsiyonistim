// ═══════════════════════════════════════════════════════════════════════════════
// Analytics Event Types — Customer Behavior Tracking
// ═══════════════════════════════════════════════════════════════════════════════

/** Event types tracked by the analytics system */
export type AnalyticsEventType =
  | "page_view"
  | "feature_click"
  | "conversation_start"
  | "reservation_initiate"
  | "payment_initiate"
  | "human_handoff";

/** Raw event row in the analytics_events table */
export interface AnalyticsEvent {
  id: string;
  tenant_id: string;
  session_id: string;
  event_type: AnalyticsEventType;
  page_path: string | null;
  metadata: Record<string, unknown>;
  user_id: string | null;
  created_at: string;
}

/** Payload for tracking an event (sent to API or directly to Supabase) */
export interface TrackEventPayload {
  event_type: AnalyticsEventType;
  page_path?: string;
  metadata?: Record<string, unknown>;
}

// ─── Behavior Analytics Dashboard Types ───────────────────────────────────────

export interface DailyActiveUsers {
  date: string;
  active_sessions: number;
  page_views: number;
}

export interface DailyPageViews {
  date: string;
  count: number;
  unique_sessions: number;
}

export interface FunnelStep {
  event_type: AnalyticsEventType;
  label: string;
  count: number;
  conversion_from_previous: number; // percentage
}

export interface FeatureAdoption {
  feature: string;
  click_count: number;
  unique_sessions: number;
}

export interface BehaviorAnalyticsData {
  dailyActiveUsers: DailyActiveUsers[];
  dailyPageViews: DailyPageViews[];
  funnel: FunnelStep[];
  featureAdoption: FeatureAdoption[];
  totalEvents: number;
  uniqueSessions: number;
}

/** Label mappings for event types (Türkçe) */
export const EVENT_TYPE_LABELS: Record<AnalyticsEventType, string> = {
  page_view: "Sayfa Görüntüleme",
  feature_click: "Özellik Tıklaması",
  conversation_start: "Konuşma Başlatma",
  reservation_initiate: "Rezervasyon Başlatma",
  payment_initiate: "Ödeme Başlatma",
  human_handoff: "İnsana Yönlendirme",
};

/** Order of events in the funnel display */
export const FUNNEL_ORDER: AnalyticsEventType[] = [
  "page_view",
  "feature_click",
  "conversation_start",
  "reservation_initiate",
  "payment_initiate",
];
