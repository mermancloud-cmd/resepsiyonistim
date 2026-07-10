import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Bot, webhookCallback } from "grammy";

/**
 * POST /api/channels/telegram
 *
 * Telegram bot webhook handler.
 * Receives updates from Telegram via grammy and stores messages
 * in the conversation system.
 */
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const botToken = url.searchParams.get("token");

    if (!botToken) {
      return NextResponse.json(
        { error: "Missing bot token" },
        { status: 400 }
      );
    }

    // Find the channel by bot token
    const supabase = createAdminClient();
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("*")
      .eq("bot_token", botToken)
      .eq("channel_type", "telegram")
      .eq("is_active", true)
      .single();

    if (channelError || !channel) {
      return NextResponse.json(
        { error: "Channel not found or inactive" },
        { status: 404 }
      );
    }

    // Create bot instance with the tenant's token
    const bot = new Bot(channel.bot_token);

    // ─── Handle messages ─────────────────────────────────────────────
    bot.on("message:text", async (ctx) => {
      const chatId = ctx.chat.id.toString();
      const fromId = ctx.from?.id.toString();
      const text = ctx.message.text;
      const firstName = ctx.from?.first_name ?? "";
      const lastName = ctx.from?.last_name ?? "";
      const displayName = `${firstName} ${lastName}`.trim() || "Bilinmeyen";

      // Upsert contact
      const { data: contact } = await supabase
        .from("contacts")
        .upsert(
          {
            tenant_id: channel.tenant_id,
            phone: `tg:${chatId}`,
            name: displayName,
            metadata: {
              telegram_id: fromId,
              username: ctx.from?.username,
              chat_id: chatId,
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
        .eq("guest_phone", `tg:${chatId}`)
        .eq("channel_type", "telegram")
        .maybeSingle();

      let conversationId: string;

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({
            tenant_id: channel.tenant_id,
            channel_type: "telegram",
            channel_id: channel.id,
            guest_phone: `tg:${chatId}`,
            state: "GREETING",
            message_count: 0,
          })
          .select()
          .single();
        conversationId = newConv?.id;
        if (!conversationId) {
          console.error("Failed to create conversation for Telegram chat", chatId);
          return;
        }
      }

      // Save the message
      await supabase.from("messages").insert({
        tenant_id: channel.tenant_id,
        conversation_id: conversationId,
        role: "user",
        content: text,
        metadata: {
          telegram_chat_id: chatId,
          telegram_from_id: fromId,
          channel_type: "telegram",
        },
      });

      // Update conversation — increment message_count via raw SQL
      await supabase.rpc("increment_conversation_count", {
        conv_id: conversationId,
      }).maybeSingle();
    });

    // ─── Handle bot commands ─────────────────────────────────────────
    bot.command("start", async (ctx) => {
      const chatId = ctx.chat.id;
      const channelSettings = channel.settings as Record<string, unknown>;
      const greeting =
        (channelSettings?.greeting_message as string) ||
        "Merhaba! 👋 Size nasıl yardımcı olabilirim?\n\nRezervasyon yapmak, oda bilgisi almak veya sorularınız için buradayım.";

      await ctx.reply(greeting, {
        parse_mode: "HTML",
      });
    });

    bot.command("yardim", async (ctx) => {
      await ctx.reply(
        "📋 <b>Yardım Menüsü</b>\n\n" +
          "/start - Karşılama mesajı\n" +
          "/yardim - Bu menü\n" +
          "/rezervasyon - Rezervasyon sorgulama\n" +
          "/odalar - Oda bilgileri\n" +
          "/iletisim - İletişim bilgileri\n\n" +
          "💬 Ayrıca doğrudan yazabilir, sorularınızı iletebilirsiniz.",
        { parse_mode: "HTML" }
      );
    });

    bot.command("odalar", async (ctx) => {
      // Fetch rooms from tenant settings
      const { data: rooms } = await supabase
        .from("rooms")
        .select("name, description, base_price, capacity")
        .eq("tenant_id", channel.tenant_id)
        .eq("is_active", true);

      if (!rooms || rooms.length === 0) {
        await ctx.reply("Henüz oda bilgisi bulunmuyor.");
        return;
      }

      let msg = "🏠 <b>Odalarımız</b>\n\n";
      rooms.forEach((r) => {
        msg += `• <b>${r.name}</b>\n`;
        msg += `  ${r.description || ""}\n`;
        msg += `  Kişi: ${r.capacity} | Başlangıç: ${r.base_price}₺\n\n`;
      });

      await ctx.reply(msg, { parse_mode: "HTML" });
    });

    bot.command("iletisim", async (ctx) => {
      const { data: settings } = await supabase
        .from("tenant_settings")
        .select("phone, address, property_name")
        .eq("tenant_id", channel.tenant_id)
        .single();

      if (!settings) {
        await ctx.reply("İletişim bilgisi bulunamadı.");
        return;
      }

      await ctx.reply(
        `📍 <b>${settings.property_name || "İşletmemiz"}</b>\n\n` +
          (settings.phone ? `📞 ${settings.phone}\n` : "") +
          (settings.address ? `🏠 ${settings.address}\n` : "") +
          "\nSizden haber bekliyoruz! 🎉",
        { parse_mode: "HTML" }
      );
    });

    // Handle the webhook update via grammy
    const body = await request.text();
    const update = JSON.parse(body);

    // Wrap in webhook callback
    const handler = webhookCallback(bot, "std/http", {
      secretToken: channel.settings?.secret_token as string | undefined,
    });

    const response = await handler(
      new Request(request.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      })
    );

    return response;
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/channels/telegram
 * Set webhook URL for Telegram bot.
 * Called by owner when configuring the bot.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const botToken = url.searchParams.get("token");
    const webhookUrl = url.searchParams.get("webhook");

    if (!botToken || !webhookUrl) {
      return NextResponse.json(
        { error: "Missing token or webhook URL" },
        { status: 400 }
      );
    }

    // Find the channel
    const supabase = createAdminClient();
    const { data: channel } = await supabase
      .from("channels")
      .select("*")
      .eq("bot_token", botToken)
      .eq("channel_type", "telegram")
      .single();

    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    // Set webhook via Telegram API
    const bot = new Bot(botToken);
    const fullWebhookUrl = `${webhookUrl}/api/channels/telegram?token=${botToken}`;

    await bot.api.setWebhook(fullWebhookUrl);

    // Update channel record
    await supabase
      .from("channels")
      .update({
        webhook_url: fullWebhookUrl,
        webhook_verified_at: new Date().toISOString(),
      })
      .eq("id", channel.id);

    return NextResponse.json({
      ok: true,
      message: "Webhook başarıyla kuruldu",
      webhook_url: fullWebhookUrl,
    });
  } catch (err) {
    console.error("Telegram webhook setup error:", err);
    return NextResponse.json(
      { error: "Webhook kurulamadı" },
      { status: 500 }
    );
  }
}
