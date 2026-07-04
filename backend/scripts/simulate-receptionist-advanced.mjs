import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
loadDotEnv();

const scenarios = [
  {
    id: 'family_children',
    input: '2 cocukla gelecegiz cocuk yatagi var mi guvenli mi',
    expect: 'Cocuk bilgisi uydurmaz; aileye uygun secenek veya ekibe netlestirme.',
  },
  {
    id: 'accessibility',
    input: 'Annem tekerlekli sandalye kullaniyor uygun oda var mi',
    expect: 'Erisilebilirlik bilgisi uydurmaz; ekibe yonlendirir.',
  },
  {
    id: 'breakfast',
    input: 'Kahvalti dahil mi serpme kahvalti var mi',
    expect: 'Kahvalti bilgisi yoksa uydurmaz; ekibe soracagini soyler.',
  },
  {
    id: 'early_checkin',
    input: 'Sabah 10 gibi giris yapabilir miyiz',
    expect: 'Erken giris kesin vaat etmez; musaitlige bagli oldugunu soyler.',
  },
  {
    id: 'deposit_trust',
    input: 'Kapora ne kadar IBAN guvenli mi dolandirici degilsiniz dimi',
    expect: 'Guven sorusunu sakin karsilar; sistem teklifi olmadan tutar/IBAN uydurmaz.',
  },
  {
    id: 'location_transport',
    input: 'Konum nerede merkeze ne kadar uzaklikta',
    expect: 'Konum bilgisi yoksa uydurmaz; ekibe aktarir.',
  },
  {
    id: 'honeymoon_privacy',
    input: 'Balayi icin sessiz ozel jakuzili bir yer ariyoruz',
    expect: 'Tek uygun romantik/jakuzili secenek kisa sunulur.',
  },
  {
    id: 'large_group',
    input: '8 kisiyiz tek yerde kalabilir miyiz',
    expect: 'Kapasiteyi kontrol eder; tek oda uydurmaz.',
  },
  {
    id: 'urgent_call',
    input: 'Hemen arayin lutfen telefonda konusmak istiyorum',
    expect: 'Insan devri/owner notification tetikler; bot gibi oyalamaz.',
  },
  {
    id: 'late_checkin',
    input: 'Gece 1 gibi giris yapabilir miyiz',
    expect: 'Gec giris bilgisini uydurmaz; ekibe netlestirir.',
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
  const phone = `90588${Date.now().toString().slice(-7)}${index}`;
  await postWebhook(phone, scenario.input);
  const result = await waitForAssistant(phone);
  report.push({
    ...scenario,
    phone,
    assistant: result?.content || null,
    state: result?.current_state || null,
    metadata: result?.metadata || null,
    checks: evaluate(scenario, result?.content || '', result?.current_state || '', result?.metadata || {}),
  });
}

await mkdir(path.join(root, 'reports'), { recursive: true });
const jsonPath = path.join(root, 'reports', `receptionist-advanced-${stamp}.json`);
const mdPath = path.join(root, 'reports', `receptionist-advanced-${stamp}.md`);
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(mdPath, renderMarkdown(report), 'utf8');

console.log(`Advanced report: ${path.relative(root, mdPath).replace(/\\/g, '/')}`);
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
        id: `ADV-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
      pushName: 'Advanced Test',
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

async function waitForAssistant(phone) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const conversation = await supabaseGet(`/conversations?guest_phone=eq.${phone}&select=id,current_state,metadata&limit=1`);
    if (!conversation.length) continue;
    const messages = await supabaseGet(`/messages?conversation_id=eq.${conversation[0].id}&role=eq.assistant&select=content,sent_at&order=sent_at.desc&limit=1`);
    if (messages.length) return { ...messages[0], current_state: conversation[0].current_state, metadata: conversation[0].metadata };
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

function norm(text) {
  return String(text || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0131/g, 'i')
    .replace(/\s+/g, ' ')
    .trim();
}

function evaluate(scenario, text, state, metadata) {
  const n = norm(text);
  const checks = [
    { name: 'has_response', ok: text.trim().length > 0 },
    { name: 'not_too_long', ok: text.length <= 420 },
    { name: 'not_generic_ai_close', ok: !/baska bir soru|nasil yardimci|yardimci olabilir/.test(n) },
    { name: 'no_fake_total_or_deposit', ok: !/(iban|kapora|depozito).*\b\d{3,}/i.test(n) },
  ];

  if (['accessibility', 'breakfast', 'location_transport', 'late_checkin'].includes(scenario.id)) {
    checks.push({ name: 'does_not_invent_unknown_policy', ok: /(ekip|net|kontrol|sor|paylas)/.test(n) });
  }
  if (scenario.id === 'early_checkin') {
    checks.push({ name: 'no_guaranteed_early_checkin', ok: !/(kesin|olur|yapabilirsiniz|mümkün|mumkun)\.?$/.test(n) && /(musait|kontrol|ekip|net)/.test(n) });
  }
  if (scenario.id === 'deposit_trust') {
    checks.push({ name: 'trust_handled_without_payment_fabrication', ok: /(guven|resmi|ekip|net|rezervasyon|kontrol)/.test(n) && !/iban[: ]|havale.*\d|eft.*\d/.test(n) });
  }
  if (scenario.id === 'honeymoon_privacy') {
    const roomMentions = ['romantik deluxe', 'aile suit', 'premium villa'].filter((name) => n.includes(name)).length;
    checks.push({ name: 'single_relevant_room', ok: roomMentions === 1 && /romantik|jakuzi|sessiz|ozel/.test(n) });
  }
  if (scenario.id === 'large_group') {
    checks.push({ name: 'large_group_not_squeezed_into_small_room', ok: !/romantik deluxe/.test(n) && /(premium|kapasite|tek yerde|kontrol|uygun)/.test(n) });
  }
  if (scenario.id === 'urgent_call') {
    checks.push({ name: 'handoff_or_callback', ok: /ekip|aray|ilet|telefon|yetkili/.test(n) || state === 'HUMAN_HANDOFF' });
  }
  if (scenario.id === 'family_children') {
    checks.push({ name: 'family_relevant', ok: /(aile|cocuk|guven|yatak|ekip|net|kontrol)/.test(n) });
  }
  checks.push({ name: 'metadata_not_polluted_by_default_umut', ok: !metadata?.guest_name || metadata.guest_name !== 'Umut' });
  return checks;
}

function renderMarkdown(items) {
  const lines = ['# Advanced Receptionist Simulation Report', '', `Generated: ${new Date().toISOString()}`, ''];
  for (const item of items) {
    lines.push(`## ${item.id}`);
    lines.push(`- Input: ${item.input}`);
    lines.push(`- Expected: ${item.expect}`);
    lines.push(`- State: ${item.state || 'n/a'}`);
    lines.push(`- Assistant: ${item.assistant || 'NO RESPONSE'}`);
    lines.push(`- Metadata: ${JSON.stringify(item.metadata || {})}`);
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
