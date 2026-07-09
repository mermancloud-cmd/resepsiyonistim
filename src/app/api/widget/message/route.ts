/**
 * Widget API — Send a message from the guest to the conversation.
 *
 * POST /api/widget/message
 * Body: { conversation_id: string, content: string, guest_name?: string }
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
    const { conversation_id, content, guest_name } = body;

    if (!conversation_id || !content?.trim()) {
      return NextResponse.json(
        { error: "conversation_id ve content zorunludur" },
        { status: 400 }
      );
    }

    // Get conversation to verify tenant
    const convRes = await supabaseFetch(
      `/rest/v1/conversations?id=eq.${conversation_id}&select=tenant_id,guest_name&limit=1`
    );
    if (!Array.isArray(convRes.data) || convRes.data.length === 0) {
      return NextResponse.json({ error: "Konuşma bulunamadı" }, { status: 404 });
    }
    const conversation = convRes.data[0];
    const tenantId = conversation.tenant_id;

    // Insert message (role='user' for guest messages)
    const message = {
      conversation_id,
      tenant_id: tenantId,
      role: "user",
      content: content.trim(),
      sent_at: new Date().toISOString(),
    };
    const createRes = await supabaseFetch("/rest/v1/messages", {
      method: "POST",
      body: JSON.stringify(message),
      headers: { Prefer: "return=representation" },
    });

    if (createRes.status !== 201) {
      return NextResponse.json(
        { error: "Mesaj gönderilemedi" },
        { status: 500 }
      );
    }

    // Update conversation metadata: last_message_at, message_count, guest_name
    const updateData: Record<string, unknown> = {
      last_message_at: new Date().toISOString(),
    };
    // Increment message_count using a fetch to read then write
    // (Simpler: just set it and rely on DB triggers, or use an RPC)
    // For now, let the DB handle it or trigger update
    if (guest_name && !conversation.guest_name) {
      updateData.guest_name = guest_name;
    }

    await supabaseFetch(`/rest/v1/conversations?id=eq.${conversation_id}`, {
      method: "PATCH",
      body: JSON.stringify(updateData),
    });

    return NextResponse.json({
      message: createRes.data[0],
    });
  } catch (err) {
    console.error("Widget message API error:", err);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
