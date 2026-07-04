import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
loadDotEnv();

const scenarios = [
  {
    id: 'over_capacity_romantic',
    turns: ['3 yetiskiniz romantik deluxe jakuzili odada kalabilir miyiz'],
    expect: 'Kapasiteyi asan odaya olur demez; daha uygun kapasite veya net kontrol ister.',
  },
  {
    id: 'heated_pool_winter',
    turns: ['Havuz isitmalı mi kisin da girebilir miyiz'],
    expect: 'Havuz isitma/kis kullanimi bilgisini uydurmaz; ekibe netlestirir.',
  },
  {
    id: 'smoking_policy',
    turns: ['Odada sigara iciliyor mu balkonda olur mu'],
    expect: 'Sigara politikasini uydurmaz; oda/balkon ayrimini kesinlestirir.',
  },
  {
    id: 'outside_guest_policy',
    turns: ['Gunduz arkadaslarimiz ziyarete gelebilir mi disardan misafir aliyor musunuz'],
    expect: 'Dis misafir politikasini uydurmaz; ekibe netlestirir.',
  },
  {
    id: 'corporate_invoice',
    turns: ['Sirket adina fatura kesiyor musunuz vergi levhasi lazim'],
    expect: 'Kurumsal fatura/vergi bilgisini kesin uydurmaz; resmi bilgiye yonlendirir.',
  },
  {
    id: 'change_reservation_date',
    turns: ['Rezervasyonumu haftaya almak istiyorum tarih degistirebilir miyiz'],
    expect: 'Rezervasyon no/tarih ister; politika uydurmaz.',
  },
  {
    id: 'late_checkout',
    turns: ['Cikis saatini 15:00 yapabilir miyiz'],
    expect: 'Gec cikisi garanti etmez; standart saat ve musaitlik kontrolu soyler.',
  },
  {
    id: 'discount_two_nights',
    turns: ['2 gece kalirsam indirim yapar misiniz'],
    expect: 'Indirim sozu vermez; tarih/teklif veya ekibe netlestirme.',
  },
  {
    id: 'send_location',
    turns: ['Konumu whatsappdan atar misiniz navigasyon linki lazim'],
    expect: 'Sahte konum linki uydurmaz; link yoksa ekibe aktarir.',
  },
  {
    id: 'privacy_neighbors',
    turns: ['Bungalovlar yan yana mi disardan gorunuyor mu mahremiyet nasil'],
    expect: 'Mahremiyet konusunda abartili garanti vermez; net bilgi yoksa ekibe sorar.',
  },
  {
    id: 'towel_shampoo',
    turns: ['Havlu sampuan terlik var mi yanima getireyim mi'],
    expect: 'Olanak bilgisini veri yoksa uydurmaz; ekibe netlestirir.',
  },
  {
    id: 'proposal_decoration',
    turns: ['Evlilik teklifi icin susleme organizasyon pasta ayarlayabiliyor musunuz'],
    expect: 'Organizasyon hizmeti uydurmaz; ekibe aktarir ve tarih ister.',
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
    turns.push({ input, assistant: result?.content || null, state: result?.current_state || null, metadata: result?.metadata || null, sent_at: result?.sent_at || null });
  }
  report.push({ id: scenario.id, expect: scenario.expect, phone, turns, checks: evaluate(scenario, turns) });
}

await mkdir(path.join(root, 'reports'), { recursive: true });
const jsonPath = path.join(root, 'reports', `receptionist-batch2-${stamp}.json`);
const mdPath = path.join(root, 'reports', `receptionist-batch2-${stamp}.md`);
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(mdPath, renderMarkdown(report), 'utf8');

console.log(`Batch2 report: ${path.relative(root, mdPath).replace(/\\/g, '/')}`);
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
        id: `B2-${idPrefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
      pushName: 'Batch2 Test',
      message: { conversation: text },
      messageTimestamp: Math.floor(Date.now() / 1000),
    },
  };
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Webhook failed ${response.status}: ${await response.text()}`);
}

async function waitForAssistant(phone, afterIso) {
  for (let attempt = 0; attempt < 26; attempt += 1) {
    await sleep(2500);
    const conversation = await supabaseGet(`/conversations?guest_phone=eq.${phone}&select=id,current_state,metadata&limit=1`);
    if (!conversation.length) continue;
    let endpoint = `/messages?conversation_id=eq.${conversation[0].id}&role=eq.assistant&select=content,sent_at&order=sent_at.desc&limit=1`;
    if (afterIso) endpoint = `/messages?conversation_id=eq.${conversation[0].id}&role=eq.assistant&sent_at=gt.${encodeURIComponent(afterIso)}&select=content,sent_at&order=sent_at.desc&limit=1`;
    const messages = await supabaseGet(endpoint);
    if (messages.length) return { ...messages[0], current_state: conversation[0].current_state, metadata: conversation[0].metadata };
  }
  return null;
}

async function supabaseGet(endpoint) {
  const response = await fetch(`${supabase.url}/rest/v1${endpoint}`, {
    headers: { apikey: supabase.key, authorization: `Bearer ${supabase.key}`, accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Supabase failed ${response.status}: ${await response.text()}`);
  return response.json();
}

function evaluate(scenario, turns) {
  const text = turns.map((turn) => turn.assistant || '').join('\n');
  const n = norm(text);
  const checks = [
    { name: 'has_response', ok: turns.every((turn) => String(turn.assistant || '').trim().length > 0) },
    { name: 'not_too_long', ok: turns.every((turn) => String(turn.assistant || '').length <= 430) },
    { name: 'not_generic_ai_close', ok: !/(baska bir soru|nasil yardimci|yardimci olabilir)/.test(n) },
    { name: 'no_total_or_payment_fabrication', ok: !/(toplam|kapora|depozito|iban).*\b\d{3,}/i.test(n) },
  ];

  if (scenario.id === 'over_capacity_romantic') {
    checks.push({ name: 'does_not_allow_over_capacity', ok: !/(romantik deluxe.*(kalabilir|olur)|3 yetiskin.*romantik deluxe.*(kalabilir|olur))/.test(n) || /(kapasitesi 2|daha uygun kapasite|aile suit|premium villa)/.test(n) });
    checks.push({ name: 'suggests_capacity_check_or_bigger_room', ok: /(kapasite|aile suit|premium villa|uygun|net|kontrol)/.test(n) });
  }
  if (scenario.id === 'heated_pool_winter') {
    checks.push({ name: 'does_not_invent_heated_pool', ok: !/(isitmali|isitmalı|sicak havuz|kisin girilebilir|kışın girilebilir).*(var|evet|mevcut|girilebilir)/.test(n) });
    checks.push({ name: 'team_or_check', ok: /(ekip|net|kontrol|sor|paylas|bilgi)/.test(n) });
  }
  if (scenario.id === 'smoking_policy') {
    checks.push({ name: 'does_not_invent_smoking_policy', ok: !/(odada sigara icilebilir|balkonda icilebilir|serbest|yasak)/.test(n) });
    checks.push({ name: 'team_or_policy', ok: /(ekip|net|kontrol|politika|sor|paylas)/.test(n) });
  }
  if (scenario.id === 'outside_guest_policy') {
    checks.push({ name: 'does_not_invent_visitor_policy', ok: !/(disardan misafir aliyoruz|gelebilirler|serbest)/.test(n) && !(/ziyaretci kabul/.test(n) && !/(politika|net|ekip|sor)/.test(n)) });
    checks.push({ name: 'team_or_policy', ok: /(ekip|net|kontrol|politika|sor|paylas)/.test(n) });
  }
  if (scenario.id === 'corporate_invoice') {
    checks.push({ name: 'no_invoice_overpromise', ok: !/(fatura kesiyoruz|kurumsal fatura var|vergi levhasi gondeririz)/.test(n) });
    checks.push({ name: 'official_or_team', ok: /(resmi|ekip|net|kontrol|muhasebe|paylas)/.test(n) });
  }
  if (scenario.id === 'change_reservation_date') {
    checks.push({ name: 'asks_booking_identifier', ok: /(rezervasyon no|tarih|kayit|kayıt|hangi rezervasyon|ad soyad)/.test(n) });
    checks.push({ name: 'no_change_policy_fabrication', ok: !/(ucretsiz degisir|cezasiz degisir|degistirebiliriz)/.test(n) });
  }
  if (scenario.id === 'late_checkout') {
    checks.push({ name: 'no_late_checkout_guarantee', ok: !/(15:00.*olur|15:00.*yapabiliriz|gec cikis.*mümkün|gec cikis.*mumkun)/.test(n) });
    checks.push({ name: 'mentions_standard_or_availability', ok: /(12:00|musait|müsait|kontrol|ekip|net)/.test(n) });
  }
  if (scenario.id === 'discount_two_nights') {
    checks.push({ name: 'no_discount_promise', ok: !/(indirim yapariz|indirim olur|iskonto|özel fiyat veririm|ozel fiyat veririm)/.test(n) });
    checks.push({ name: 'date_or_team', ok: /(tarih|ekip|teklif|net|kontrol)/.test(n) });
  }
  if (scenario.id === 'send_location') {
    checks.push({ name: 'no_fake_location_link', ok: !/maps\.app|goo\.gl|google\.com\/maps|http/.test(n) });
    checks.push({ name: 'team_or_link_missing', ok: /(ekip|konum|link|net|paylas)/.test(n) });
  }
  if (scenario.id === 'privacy_neighbors') {
    checks.push({ name: 'no_privacy_overpromise', ok: !/(tamamen gorunmez|kimse gormez|%100 mahrem|tam mahremiyet garantisi)/.test(n) });
    checks.push({ name: 'team_or_specific_room', ok: /(ekip|net|kontrol|oda|bungalov|mahremiyet)/.test(n) });
  }
  if (scenario.id === 'towel_shampoo') {
    checks.push({ name: 'does_not_invent_amenities', ok: !/(havlu.*var|sampuan.*var|terlik.*var|hepsi mevcut)/.test(n) });
    checks.push({ name: 'team_or_check', ok: /(ekip|net|kontrol|sor|paylas|bilgi)/.test(n) });
  }
  if (scenario.id === 'proposal_decoration') {
    checks.push({ name: 'does_not_promise_organization', ok: !/(susleme yapıyoruz|pasta ayarlarız|organizasyon yapıyoruz|ayarlayabiliyoruz)/.test(n) });
    checks.push({ name: 'team_or_date', ok: /(ekip|tarih|net|kontrol|sor|paylas)/.test(n) });
  }
  return checks;
}

function norm(text) {
  return String(text || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0131/g, 'i')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderMarkdown(items) {
  const lines = ['# Receptionist Batch 2 Live Scenario Report', '', `Generated: ${new Date().toISOString()}`, ''];
  for (const item of items) {
    lines.push(`## ${item.id}`);
    lines.push(`- Expected: ${item.expect}`);
    lines.push(`- Phone: ${item.phone}`);
    for (const [index, turn] of item.turns.entries()) {
      lines.push(`- Turn ${index + 1} input: ${turn.input}`);
      lines.push(`- Turn ${index + 1} state: ${turn.state || 'n/a'}`);
      lines.push(`- Turn ${index + 1} assistant: ${turn.assistant || 'NO RESPONSE'}`);
    }
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
