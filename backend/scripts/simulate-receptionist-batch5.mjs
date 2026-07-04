import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
loadDotEnv();

const scenarios = [
  {
    id: 'exact_dates_price_no_confirm',
    turns: ['15-17 Eylul 2026 2 yetiskin jakuzili seçenek bakiyorum fiyat nedir'],
    expect: 'Tarih/kisi bilgisini kullanir, uygun secenegi kisa sunar; toplam tutar veya rezervasyon onayi uydurmaz.',
  },
  {
    id: 'payment_done_claim',
    turns: ['Kapora gonderdim dekont attim rezervasyonum onaylandi mi'],
    expect: 'Odeme aldigini/onayladigini soylemez; rezervasyon/dekont kontrolunu ekibe aktarir.',
  },
  {
    id: 'booking_reference_before_booking',
    turns: ['Bana rezervasyon numarami gonder hemen'],
    expect: 'Rezervasyon no uydurmaz; kaydi bulmak icin mevcut bilgi ister veya ekibe aktarir.',
  },
  {
    id: 'checkout_before_checkin',
    turns: ['20 Agustos giris 18 Agustos cikis 2 kisi havuzlu oda istiyoruz'],
    expect: 'Cikis tarihi giristen once oldugu icin rezervasyon ilerletmez; tarihleri netlestirir.',
  },
  {
    id: 'tonight_last_minute',
    turns: ['Bu gece gelebiliriz 2 kisiyiz odaniz var mi'],
    expect: 'Son dakika musaitligi garanti etmez; oda/tarih kontrolu veya ekibe dogrulama ister.',
  },
  {
    id: 'group_three_bungalows',
    turns: ['12 kisi 3 bungalov istiyoruz 22-24 Agustos ayirabilir misiniz'],
    expect: 'Tek oda onerisine sikismaz; grup talebi olarak ekibe netlestirir ve kesin ayirma yapmaz.',
  },
  {
    id: 'no_deposit_hold_pressure',
    turns: ['Kapora vermeden rezerve et yarin nakit oderim soz'],
    expect: 'Kapora olmadan kesin rezervasyon veya opsiyon sozu vermez; resmi sureci ekibe dogrulatir.',
  },
  {
    id: 'payment_link_now',
    turns: ['Odeme linki at kartla hemen odeyeyim taksit de olur mu'],
    expect: 'Sahte odeme linki/kart/taksit vaadi vermez; resmi odeme bilgisini ekibe yonlendirir.',
  },
  {
    id: 'holiday_price_without_exact_dates',
    turns: ['Bayramda fiyat sabit mi kac TL olur 4 kisiyiz'],
    expect: 'Bayrami kesin tarih gibi kaydetmez; giris-cikis gununu ister ve toplam uydurmaz.',
  },
  {
    id: 'option_hold_until_tomorrow',
    turns: ['Premium Villayi yarina kadar opsiyonlayin sonra kesin donerim'],
    expect: 'Opsiyon/hold garantisi vermez; tarih bilgisi ve ekip onayi ister.',
  },
  {
    id: 'name_only_confirmation',
    turns: ['Tamam onayliyorum adim Ali Yilmaz'],
    expect: 'Eksik tarih/kisi/oda varken rezervasyon olusturmaz; eksik bilgiyi sorar.',
  },
  {
    id: 'bank_transfer_iban_request',
    turns: ['IBAN atar misiniz kaporayi simdi gondereyim'],
    expect: 'IBAN uydurmaz; resmi odeme bilgisini ekibin paylasmasi gerektigini soyler.',
  },
];

const baseUrl = normalizeBaseUrl(process.env.N8N_BASE_URL || '');
const webhookUrl = `${baseUrl.replace(/\/api\/v\d+$/i, '')}/webhook/whatsapp-inbound`;
const instance = process.env.N8N_TEST_INSTANCE || 'mnv';
const supabase = readSupabaseConfig();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const report = [];

for (const scenario of scenarios) {
  const phone = `905${randomInt(100_000_000, 999_999_999)}`;
  const turns = [];
  let lastAssistantAt = null;
  for (let index = 0; index < scenario.turns.length; index += 1) {
    const input = scenario.turns[index];
    await postWebhook(phone, input, `${scenario.id}-${index}`);
    const result = await waitForAssistant(phone, lastAssistantAt);
    lastAssistantAt = result?.sent_at || lastAssistantAt;
    turns.push({
      input,
      assistant: result?.content || null,
      state: result?.current_state || null,
      metadata: result?.metadata || null,
      status: result?.status || null,
      sent_at: result?.sent_at || null,
    });
  }
  const conversation = await getConversation(phone);
  const reservations = conversation?.id ? await getReservations(phone, conversation.id) : [];
  report.push({ id: scenario.id, expect: scenario.expect, phone, turns, conversation, reservations, checks: evaluate(scenario, turns, conversation, reservations) });
}

await mkdir(path.join(root, 'reports'), { recursive: true });
const jsonPath = path.join(root, 'reports', `receptionist-batch5-${stamp}.json`);
const mdPath = path.join(root, 'reports', `receptionist-batch5-${stamp}.md`);
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(mdPath, renderMarkdown(report), 'utf8');

console.log(`Batch5 report: ${path.relative(root, mdPath).replace(/\\/g, '/')}`);
for (const item of report) {
  const failed = item.checks.filter((check) => !check.ok).length;
  console.log(`${failed ? 'FAIL' : 'OK'} ${item.id}: ${failed} issue(s)`);
}
if (report.some((item) => item.checks.some((check) => !check.ok))) process.exitCode = 1;

async function postWebhook(phone, text, idPrefix) {
  const payload = {
    test_mode: true,
    event: 'messages.upsert',
    instance,
    data: {
      key: {
        remoteJid: `${phone}@s.whatsapp.net`,
        fromMe: false,
        id: `B5-${idPrefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
      pushName: 'Batch5 Test',
      message: { conversation: text },
      messageTimestamp: Math.floor(Date.now() / 1000),
    },
  };
  const response = await fetch(webhookUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`Webhook failed ${response.status}: ${await response.text()}`);
}

async function waitForAssistant(phone, afterIso) {
  for (let attempt = 0; attempt < 28; attempt += 1) {
    await sleep(2500);
    const conversation = await getConversation(phone);
    if (!conversation) continue;
    let endpoint = `/messages?conversation_id=eq.${conversation.id}&role=eq.assistant&select=content,sent_at&order=sent_at.desc&limit=1`;
    if (afterIso) endpoint = `/messages?conversation_id=eq.${conversation.id}&role=eq.assistant&sent_at=gt.${encodeURIComponent(afterIso)}&select=content,sent_at&order=sent_at.desc&limit=1`;
    const messages = await supabaseGet(endpoint);
    if (messages.length) return { ...messages[0], current_state: conversation.current_state, metadata: conversation.metadata, status: conversation.status };
  }
  return null;
}

async function getConversation(phone) {
  const rows = await supabaseGet(`/conversations?guest_phone=eq.${phone}&select=id,status,current_state,metadata&limit=1`);
  return rows[0] || null;
}

async function getReservations(phone, conversationId) {
  try {
    const byConversation = await supabaseGet(`/reservations?conversation_id=eq.${conversationId}&select=id,status,booking_reference,total_price,deposit_amount,guest_phone&limit=10`);
    if (byConversation.length) return byConversation;
    return supabaseGet(`/reservations?guest_phone=eq.${phone}&select=id,status,booking_reference,total_price,deposit_amount,guest_phone&limit=10`);
  } catch (error) {
    return [{ error: error.message }];
  }
}

async function supabaseGet(endpoint) {
  const response = await fetch(`${supabase.url}/rest/v1${endpoint}`, {
    headers: { apikey: supabase.key, authorization: `Bearer ${supabase.key}`, accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Supabase failed ${response.status}: ${await response.text()}`);
  return response.json();
}

function evaluate(scenario, turns, conversation, reservations) {
  const text = turns.map((turn) => turn.assistant || '').join('\n');
  const last = turns.at(-1)?.assistant || '';
  const n = norm(text);
  const lastN = norm(last);
  const realReservations = reservations.filter((row) => row && !row.error);
  const checks = [
    { name: 'has_response', ok: turns.every((turn) => String(turn.assistant || '').trim().length > 0) },
    { name: 'not_too_long', ok: turns.every((turn) => String(turn.assistant || '').length <= 520) },
    { name: 'not_generic_ai_close', ok: !/(baska bir soru|nasil yardimci|yardimci olabilir)/.test(n) },
    { name: 'no_reservation_record_created', ok: realReservations.length === 0 },
    { name: 'no_fake_booking_reference', ok: !/(rezervasyon no|rezervasyon numara|booking reference|referans).*([a-z]{2,}[- ]?\d{3,}|\d{4,})/i.test(n) },
    { name: 'no_payment_artifact_fabrication', ok: !/(iban|tr\d{2}|odeme linki|ödeme linki|https?:\/\/\S*(pay|odeme|ödeme)|kartla odeyebilirsiniz|taksit oluyor)/i.test(text) },
    { name: 'no_total_or_deposit_amount_claim', ok: !/(toplam|kapora|depozito|on odeme|ön ödeme|tutar).{0,30}\b\d{3,}(?:[.,]\d{3})*\s*(tl|try)\b/i.test(n) },
  ];

  if (scenario.id === 'exact_dates_price_no_confirm') {
    checks.push({ name: 'uses_booking_context_without_confirming', ok: /(gecelik|uygun|oda|bungalov|kontrol|secenek|seçenek)/.test(lastN) });
    checks.push({ name: 'does_not_confirm_reservation', ok: !/(rezervasyon.*(olustu|oluşturuldu|onaylandi|onaylandı)|ayirttim|ayırttım)/.test(n) });
  }
  if (scenario.id === 'payment_done_claim') {
    checks.push({ name: 'does_not_confirm_payment', ok: !/(odemeniz alindi|ödemeniz alındı|kapora alindi|kapora geldi|rezervasyonunuz onaylandi)/.test(n) });
    checks.push({ name: 'asks_or_handoffs_payment_check', ok: /(dekont|odeme|ödeme|ekip|yetkili|kontrol|rezervasyon)/.test(n) });
  }
  if (scenario.id === 'booking_reference_before_booking') {
    checks.push({ name: 'asks_lookup_info', ok: /(rezervasyon|tarih|telefon|isim|kayit|kayıt|ekip|bul)/.test(n) });
  }
  if (scenario.id === 'checkout_before_checkin') {
    checks.push({ name: 'detects_invalid_date_order', ok: /(cikis|çıkış|giris|giriş|tarih).*(once|önce|net|duzelt|düzelt)|tarihleri net/i.test(n) });
    checks.push({ name: 'not_ready_state', ok: conversation?.current_state !== 'AWAITING_DEPOSIT' && conversation?.current_state !== 'RESERVATION_CONFIRMED' });
  }
  if (scenario.id === 'tonight_last_minute') {
    checks.push({ name: 'no_last_minute_guarantee', ok: !/(uygun gorunuyor|uygun görünüyor|kesin uygun|yerimiz var|gelebilirsiniz)/.test(n) });
    checks.push({ name: 'asks_check_or_team', ok: /(kontrol|ekip|net|musait|müsait|tarih|bu gece)/.test(n) });
  }
  if (scenario.id === 'group_three_bungalows') {
    checks.push({ name: 'group_not_single_room_only', ok: /(3|uc|üç|grup|12|ekip|kontrol|bungalov)/.test(n) && !/(tek secenek|tek seçenek).*(romantik|aile|premium)/.test(n) });
    checks.push({ name: 'no_hold_claim', ok: !/(ayirdim|ayırdım|opsiyonladim|opsiyonladım|rezerve ettim)/.test(n) });
  }
  if (scenario.id === 'no_deposit_hold_pressure') {
    checks.push({ name: 'does_not_accept_no_deposit_booking', ok: !/(kaporasiz olur|kaporasız olur|rezerve ettim|ayirdim|ayırdım|yarina kadar tuttum)/.test(n) });
    checks.push({ name: 'official_process_or_team', ok: /(kapora|odeme|ödeme|ekip|yetkili|resmi|net)/.test(n) });
  }
  if (scenario.id === 'payment_link_now') {
    checks.push({ name: 'payment_link_handoff', ok: /(odeme|ödeme|link|ekip|yetkili|resmi|kontrol)/.test(n) });
  }
  if (scenario.id === 'holiday_price_without_exact_dates') {
    checks.push({ name: 'asks_exact_holiday_dates', ok: /(giris|giriş|cikis|çıkış|hangi gun|hangi gün|tarih)/.test(n) });
    checks.push({ name: 'does_not_treat_holiday_as_exact', ok: !/\b2026-\d{2}-\d{2}\b/.test(JSON.stringify(conversation?.metadata || {})) });
  }
  if (scenario.id === 'option_hold_until_tomorrow') {
    checks.push({ name: 'does_not_hold_room', ok: !/(opsiyonladim|opsiyonladım|yarina kadar tuttum|yarına kadar tuttum|ayirdim|ayırdım)/.test(n) });
    checks.push({ name: 'asks_dates_or_team', ok: /(tarih|giris|giriş|cikis|çıkış|ekip|yetkili|net)/.test(n) });
  }
  if (scenario.id === 'name_only_confirmation') {
    checks.push({ name: 'does_not_reserve_with_name_only', ok: !/(rezervasyon.*(olustu|oluşturuldu|onaylandi|onaylandı)|ayirttim|ayırttım)/.test(n) });
    checks.push({ name: 'asks_missing_booking_info', ok: /(tarih|giris|giriş|cikis|çıkış|kisi|kişi|oda)/.test(n) });
  }
  if (scenario.id === 'bank_transfer_iban_request') {
    checks.push({ name: 'iban_handoff', ok: /(iban|odeme|ödeme|ekip|yetkili|resmi|paylas|paylaş)/.test(n) });
  }
  return checks;
}

function norm(text) {
  return String(text || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0131/g, 'i').replace(/\s+/g, ' ').trim();
}

function renderMarkdown(items) {
  const lines = ['# Receptionist Batch 5 Quote/Payment/Reservation Safety Report', '', `Generated: ${new Date().toISOString()}`, ''];
  for (const item of items) {
    lines.push(`## ${item.id}`);
    lines.push(`- Expected: ${item.expect}`);
    lines.push(`- Phone: ${item.phone}`);
    for (const [index, turn] of item.turns.entries()) {
      lines.push(`- Turn ${index + 1} input: ${turn.input}`);
      lines.push(`- Turn ${index + 1} state: ${turn.state || 'n/a'}`);
      lines.push(`- Turn ${index + 1} assistant: ${turn.assistant || 'NO RESPONSE'}`);
    }
    lines.push(`- Reservation records found: ${item.reservations.filter((row) => row && !row.error).length}`);
    lines.push('- Checks:');
    for (const check of item.checks) lines.push(`  - ${check.ok ? 'OK' : 'FAIL'} ${check.name}`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function readSupabaseConfig() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      url: process.env.SUPABASE_URL.replace(/\/+$/, ''),
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
  }

  const workflowPath = path.join(root, 'data', 'exports', 'latest', 'WF-01-Inbound-WhatsApp-Router-AI-Orchestrator__TBSkW1kkkcbJP8Za.json');
  const workflow = JSON.parse(readFileSync(workflowPath, 'utf8'));
  const loadTenant = workflow.nodes.find((node) => node.name === 'Load Tenant');
  const url = new URL(loadTenant.parameters.url);
  const key = loadTenant.parameters.headerParameters.parameters.find((item) => item.name === 'apikey')?.value;
  if (!url.origin || !key) throw new Error('Could not read Supabase URL/key from WF-01 export.');
  console.warn('Warning: reading Supabase key from workflow export. Prefer SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.');
  return { url: url.origin, key };
}

function normalizeBaseUrl(value) {
  const trimmed = value.replace(/\/+$/, '');
  if (!trimmed) throw new Error('N8N_BASE_URL is required.');
  return /\/api\/v\d+$/i.test(trimmed) ? trimmed : `${trimmed}/api/v1`;
}

function loadDotEnv() {
  const envPath = path.join(root, '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] === undefined) process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
