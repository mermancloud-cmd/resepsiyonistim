/**
 * Widget API — Fetch messages for a conversation (polling).
 *
 * GET /api/widget/messages?conversation_id=xxx
 */
import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "") || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversation_id");
  const since = searchParams.get("since"); // ISO date filter

  if (!conversationId) {
    return NextResponse.json(
      { error: "conversation_id parametresi zorunludur" },
      { status: 400 }
    );
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "") || ""}`;
  let path = `/rest/v1/messages?conversation_id=eq.${encodeURIComponent(conversationId)}&order=sent_at.asc&limit=50`;
  if (since) {
    path += `&sent_at=gt.${encodeURIComponent(since)}`;
  }

  try {
    const res = await fetch(`${url}${path}`, {
      headers: {
        apikey: `${SUPABASE_ANON_KEY}`,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    });
    const data = await res.json();
    return NextResponse.json({ messages: Array.isArray(data) ? data : [] });
  } catch (err) {
    console.error("Widget messages API error:", err);
    return NextResponse.json({ error: "Mesajlar alınamadı", messages: [] }, { status: 500 });
  }
}
