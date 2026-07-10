import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Facebook Messenger Webhook
 *
 * GET  /api/channels/messenger — Webhook verification (Facebook handshake)
 * POST /api/channels/messenger — Incoming messages from Messenger
 */

// ─── GET: Webhook Verification ──────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    // Find channel by verify token
    const supabase = createAdminClient();
    const { data: channel } = await supabase
      .from("channels")
      .select("*")
      .eq("verify_token", token)
      .eq("channel_type", "facebook_messenger")
      .eq("is_active", true)
      .single();

    if (!channel) {
      return new Response("Verification failed: no matching channel", {
        status: 403,
      });
    }

    if (mode === "subscribe" && token === channel.verify_token) {
      console.log(`Messenger webhook verified for tenant ${channel.tenant_id}`);

      // Update verification timestamp
      await supabase
        .from("channels")
        .update({ webhook_verified_at: new Date().toISOString() })
        .eq("id", channel.id);

      return new Response(challenge, { status: 200 });
    }

    return new Response("Verification failed: token mismatch", {
      status: 403,
    });
  } catch (err) {
    console.error("Messenger webhook verification error:", err);
    return new Response("Internal error", { status: 500 });
  }
}

// ─── POST: Incoming Messages ───────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    // Parse the incoming webhook payload
    if (body.object !== "page") {
      return NextResponse.json({ error: "Invalid object" }, { status: 400 });
    }

    for (const entry of body.entry ?? []) {
      const pageId = entry.id;

      // Find channel by page ID
      const { data: channel } = await supabase
        .from("channels")
        .select("*")
        .eq("page_id", pageId)
        .eq("channel_type", "facebook_messenger")
        .eq("is_active", true)
        .single();

      if (!channel) {
        console.warn(`No active channel found for page ${pageId}`);
        continue;
      }

      for (const messaging of entry.messaging ?? []) {
        // Message event
        if (messaging.message && messaging.sender) {
          const senderId = messaging.sender.id;
          const text = messaging.message.text || "";
          const messageId = messaging.message.mid;

          // Skip echoes (messages sent by the page itself)
          if (messaging.message.is_echo) continue;

          if (!text) continue; // ignore non-text messages for now

          // Upsert contact
          const { data: contact } = await supabase
            .from("contacts")
            .upsert(
              {
                tenant_id: channel.tenant_id,
                phone: `fb:${senderId}`,
                name: `Facebook Kullanıcı ${senderId}`,
                metadata: {
                  page_id: pageId,
                  sender_id: senderId,
                  channel_type: "facebook_messenger",
                },
              },
              {
                onConflict: "tenant_id,phone",
                ignoreDuplicates: false,
              }
            )
            .select()
            .single();

          // Find or create conversation
          const { data: existingConv } = await supabase
            .from("conversations")
            .select("id")
            .eq("tenant_id", channel.tenant_id)
            .eq("guest_phone", `fb:${senderId}`)
            .eq("channel_type", "facebook_messenger")
            .maybeSingle();

          let conversationId: string;

          if (existingConv) {
            conversationId = existingConv.id;
          } else {
            const { data: newConv } = await supabase
              .from("conversations")
              .insert({
                tenant_id: channel.tenant_id,
                channel_type: "facebook_messenger",
                channel_id: channel.id,
                guest_phone: `fb:${senderId}`,
                state: "GREETING",
                message_count: 0,
              })
              .select()
              .single();
            conversationId = newConv?.id;
            if (!conversationId) continue;
          }

          // Save the message
          await supabase.from("messages").insert({
            tenant_id: channel.tenant_id,
            conversation_id: conversationId,
            role: "user",
            content: text,
            metadata: {
              messenger_message_id: messageId,
              sender_id: senderId,
              page_id: pageId,
              channel_type: "facebook_messenger",
            },
          });

          // Update conversation
          await supabase.rpc("increment_conversation_count", {
            conv_id: conversationId,
          }).maybeSingle();
        }

        // Message delivered / read events — ignore for now
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Messenger webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
