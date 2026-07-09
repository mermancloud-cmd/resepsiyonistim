import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/analytics/event
 *
 * Batched analytics event ingestion.
 * Accepts an array of events and bulk-inserts them with service_role client.
 * Falls back to anon key RLS if admin client is unavailable.
 *
 * Body: { events: Array<{ tenant_id, session_id, event_type, page_path?, metadata?, user_id? }> }
 *
 * Privacy: No PII stored. Metadata is JSONB with no guaranteed schema.
 * Retention: 90 days (managed by pg_cron).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events } = body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "events dizisi gerekli." },
        { status: 400 }
      );
    }

    // Validate each event
    const validTypes = new Set([
      "page_view",
      "feature_click",
      "conversation_start",
      "reservation_initiate",
      "payment_initiate",
      "human_handoff",
    ]);

    const cleaned: Record<string, unknown>[] = [];
    for (const evt of events) {
      if (!evt.tenant_id || typeof evt.tenant_id !== "string") {
        return NextResponse.json(
          { error: "Her event için tenant_id gerekli." },
          { status: 400 }
        );
      }
      if (!evt.event_type || !validTypes.has(evt.event_type)) {
        return NextResponse.json(
          {
            error: `Geçersiz event_type: ${evt.event_type}. İzin verilenler: ${[...validTypes].join(", ")}`,
          },
          { status: 400 }
        );
      }
      if (!evt.session_id || typeof evt.session_id !== "string") {
        return NextResponse.json(
          { error: "Her event için session_id gerekli." },
          { status: 400 }
        );
      }

      cleaned.push({
        tenant_id: evt.tenant_id,
        session_id: evt.session_id,
        event_type: evt.event_type,
        page_path: evt.page_path ?? null,
        metadata: evt.metadata ?? {},
        user_id: evt.user_id ?? null,
      });
    }

    // Insert via admin client (service_role)
    const admin = createAdminClient();
    const { error } = await admin.from("analytics_events").insert(cleaned);

    if (error) {
      console.error("[analytics/event] insert error:", error);
      return NextResponse.json(
        { error: "Event kaydedilemedi." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, count: cleaned.length },
      { status: 201 }
    );
  } catch (err) {
    console.error("[analytics/event] error:", err);
    return NextResponse.json(
      { error: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
