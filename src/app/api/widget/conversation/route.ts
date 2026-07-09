/**
 * Widget API — Create or retrieve a conversation for a guest phone.
 *
 * POST /api/widget/conversation
 * Body: { tenant_slug: string, guest_phone: string, guest_name?: string }
 * Returns: { conversation_id: string, messages: Array }
 *
 * Uses service role key server-side to bypass RLS.
 */
import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "") || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function supabaseFetch(path: string, options: RequestInit = {}) {
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: `${SUPABASE_ANON_KEY}`,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_slug, guest_phone, guest_name } = body;

    if (!tenant_slug || !guest_phone) {
      return NextResponse.json(
        { error: "tenant_slug ve guest_phone zorunludur" },
        { status: 400 }
      );
    }

    // 1. Look up tenant by slug
    const tenantRes = await supabaseFetch(
      `/rest/v1/tenants?select=id&slug=eq.${encodeURIComponent(tenant_slug)}&limit=1`
    );
    if (tenantRes.status !== 200 || !Array.isArray(tenantRes.data) || tenantRes.data.length === 0) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }
    const tenantId = tenantRes.data[0].id;

    // 2. Look for existing active conversation for this guest + tenant
    const convRes = await supabaseFetch(
      `/rest/v1/conversations?tenant_id=eq.${tenantId}&guest_phone=eq.${encodeURIComponent(guest_phone)}&status=neq.closed&order=last_message_at.desc&limit=1`
    );

    let conversationId: string;

    if (Array.isArray(convRes.data) && convRes.data.length > 0) {
      conversationId = convRes.data[0].id;
    } else {
      // 3. Create new conversation
      const newConv = {
        tenant_id: tenantId,
        guest_phone: guest_phone,
        guest_name: guest_name || null,
        channel: "widget",
        status: "active",
        current_state: "GREETING",
        message_count: 0,
        metadata: {},
        started_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      };
      const createRes = await supabaseFetch("/rest/v1/conversations", {
        method: "POST",
        body: JSON.stringify(newConv),
        headers: { Prefer: "return=representation" },
      });

      if (createRes.status !== 201 || !Array.isArray(createRes.data) || createRes.data.length === 0) {
        return NextResponse.json(
          { error: "Konuşma oluşturulamadı" },
          { status: 500 }
        );
      }
      conversationId = createRes.data[0].id;
    }

    // 4. Fetch messages for this conversation (last 50)
    const msgRes = await supabaseFetch(
      `/rest/v1/messages?conversation_id=eq.${conversationId}&order=sent_at.asc&limit=50`
    );
    const messages = Array.isArray(msgRes.data) ? msgRes.data : [];

    // 5. Fetch tenant settings for welcome message / persona
    const settingsRes = await supabaseFetch(
      `/rest/v1/tenant_settings?tenant_id=eq.${tenantId}&limit=1`
    );
    const settings = Array.isArray(settingsRes.data) && settingsRes.data.length > 0
      ? settingsRes.data[0]
      : {};

    return NextResponse.json({
      conversation_id: conversationId,
      tenant_id: tenantId,
      messages,
      settings: {
        property_name: settings.property_name || null,
        welcome_message: settings.welcome_message || null,
        currency: settings.currency || "TRY",
        check_in_time: settings.check_in_time || "14:00",
        check_out_time: settings.check_out_time || "11:00",
      },
    });
  } catch (err) {
    console.error("Widget conversation API error:", err);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
