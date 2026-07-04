import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
loadDotEnv();

const scenarios = [
  {
    id: 'rooms_one_by_one',
    input: 'Bungalovlarınızı paylaşır mısınız?',
    expect: 'Tek bungalov kısa tanıtılır, tüm liste dökülmez.',
  },
  {
    id: 'photo_request',
    input: 'Fotoğraf atar mısınız?',
    expect: 'Fotoğraf URL varsa paylaşılır; yoksa ekibe iletildiği söylenir.',
  },
  {
    id: 'ambiguous_date',
    input: 'Ağustos sonunda 2 kişiyiz',
    expect: 'Kesin tarih uydurmaz, giriş ve çıkış gününü sorar.',
  },
  {
    id: 'explicit_date_room',
    input: '15 Temmuz giriş 18 Temmuz çıkış 2 yetişkin jakuzili oda',
    expect: 'Tarih/kişi/istek alınır, uygun oda kısa sunulur veya yıl netleştirilir.',
  },
  {
    id: 'price_objection',
    input: 'Fiyatlar çok pahalı, başka yerde 3000 TL',
    expect: 'Savunmacı olmaz; değer/olanak ve uygun seçenek yönlendirmesi yapar.',
  },
  {
    id: 'pet_policy',
    input: 'Köpeğimizle gelebilir miyiz?',
    expect: 'Bilgi yoksa kabul/ret uydurmaz, ekibe aktarır.',
  },
  {
    id: 'cancel_request',
    input: 'İptal etmek istiyorum',
    expect: 'Rezervasyon no veya tarih ister; politika uydurmaz.',
  },
  {
    id: 'multi_question',
    input: 'Kaç oda var fiyatlar nedir jakuzi var mı havuz var mı kahvaltı dahil mi erken check in olur mu',
    expect: 'Hepsini uzun uzun cevaplamaz; sırayla ve kısa ilerler.',
  },
];

const baseUrl = normalizeBaseUrl(process.env.N8N_BASE_URL || '');
const webhookUrl = `${baseUrl.replace(/\/api\/v\d+$/i, '')}/webhook/whatsapp-inbound`;
const instance = process.env.N8N_TEST_INSTANCE || 'mnv';
const supabase = readSupabaseConfig();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const report = [];

for (let index = 0; index < scenarios.length; index += 1) {
  const scenario = scenarios[index];
  const phone = `90577${Date.now().toString().slice(-7)}${index}`;
  await postWebhook(phone, scenario.input);
  const result = await waitForAssistant(phone);
  report.push({
    ...scenario,
    phone,
    assistant: result?.content || null,
    state: result?.current_state || null,
    checks: evaluate(scenario, result?.content || ''),
  });
}

await mkdir(path.join(root, 'reports'), { recursive: true });
const jsonPath = path.join(root, 'reports', `receptionist-simulation-${stamp}.json`);
const mdPath = path.join(root, 'reports', `receptionist-simulation-${stamp}.md`);
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(mdPath, renderMarkdown(report), 'utf8');

console.log(`Simulation report: ${path.relative(root, mdPath).replace(/\\/g, '/')}`);
for (const item of report) {
  const failed = item.checks.filter((check) => !check.ok).length;
  console.log(`${failed ? 'FAIL' : 'OK'} ${item.id}: ${failed} issue(s)`);
}

async function postWebhook(phone, text) {
  const payload = {
    test_mode: true,
    event: 'messages.upsert',
    instance,
    data: {
      key: {
        remoteJid: `${phone}@s.whatsapp.net`,
        fromMe: false,
        id: `SIM-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
      pushName: 'Simulasyon',
      message: { conversation: text },
      messageTimestamp: Math.floor(Date.now() / 1000),
    },
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed ${response.status}: ${await response.text()}`);
  }
}

async function waitForAssistant(phone) {
  for (let attempt = 0; attempt < 18; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const conversation = await supabaseGet(`/conversations?guest_phone=eq.${phone}&select=id,current_state&limit=1`);
    if (!conversation.length) continue;
    const messages = await supabaseGet(`/messages?conversation_id=eq.${conversation[0].id}&role=eq.assistant&select=content,sent_at&order=sent_at.desc&limit=1`);
    if (messages.length) return { ...messages[0], current_state: conversation[0].current_state };
  }
  return null;
}

async function supabaseGet(endpoint) {
  const response = await fetch(`${supabase.url}/rest/v1${endpoint}`, {
    headers: {
      apikey: supabase.key,
      authorization: `Bearer ${supabase.key}`,
      accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error(`Supabase failed ${response.status}: ${await response.text()}`);
  return response.json();
}

function evaluate(scenario, text) {
  const normalized = text.toLocaleLowerCase('tr-TR');
  const checks = [
    { name: 'has_response', ok: text.trim().length > 0 },
    { name: 'not_too_long', ok: text.length <= 420 },
    { name: 'not_empty_generic_close', ok: !/başka bir soru|nasıl yardımcı olabilirim/i.test(text) },
  ];

  if (scenario.id === 'rooms_one_by_one' || scenario.id === 'multi_question') {
    const roomMentions = ['romantik deluxe', 'aile suit', 'premium villa'].filter((name) => normalized.includes(name)).length;
    checks.push({ name: 'single_room_only', ok: roomMentions <= 1 });
  }
  if (scenario.id === 'ambiguous_date') {
    checks.push({ name: 'asks_exact_date', ok: /giriş|giris|çıkış|cikis|hangi gün|hangi gun|net tarih/i.test(text) });
    checks.push({ name: 'does_not_claim_availability_check', ok: !/müsaitliği kontrol edip|tarih bilgilerinizi aldım/i.test(text) });
  }
  if (scenario.id === 'photo_request') {
    checks.push({ name: 'photo_handled', ok: /foto|görsel|resim|link|ekib/i.test(text) });
  }
  if (scenario.id === 'pet_policy') {
    checks.push({ name: 'no_fake_pet_policy', ok: !/kabul ediyoruz|kabul etmiyoruz|kabul etmiyor|kabul edilmez|kabul edilmiyor/i.test(text) });
  }
  return checks;
}

function renderMarkdown(items) {
  const lines = ['# Receptionist Simulation Report', '', `Generated: ${new Date().toISOString()}`, ''];
  for (const item of items) {
    lines.push(`## ${item.id}`);
    lines.push(`- Input: ${item.input}`);
    lines.push(`- Expected: ${item.expect}`);
    lines.push(`- State: ${item.state || 'n/a'}`);
    lines.push(`- Assistant: ${item.assistant || 'NO RESPONSE'}`);
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
