import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
loadDotEnv();

const scenarios = [
  {
    id: 'multi_turn_collect_then_present',
    turns: ['Fiyat alabilir miyim', '12-14 Eylul 2 yetiskin 1 cocuk'],
    expect: 'Ikinci turda bilinen tarih/kisi bilgisini tekrar sormadan uygun tek secenek sunar.',
  },
  {
    id: 'reserve_without_dates',
    turns: ['Tamam bunu ayirtalim rezervasyon yap'],
    expect: 'Eksik tarih/kisi/oda varken rezervasyon olusturmaz; eksigi sorar.',
  },
  {
    id: 'late_arrival_key',
    turns: ['Gece 2 gibi gelecegiz anahtari nasil aliyoruz'],
    expect: 'Gece giris/anahtar teslim bilgisini uydurmaz; ekibe netlestirir.',
  },
  {
    id: 'min_stay_checkout_times',
    turns: ['Minimum kac gece kalabiliyoruz giris cikis saatleri nedir'],
    expect: 'Ayar verisinden min gece ve check-in/out saatini kisa aktarir.',
  },
  {
    id: 'children_without_adult',
    turns: ['2 cocuk gelecek yetiskin yok oda tutabilir miyiz'],
    expect: 'Yetiskin olmadan rezervasyon ilerletmez; sorumluluk/ekip netlestirme ister.',
  },
  {
    id: 'many_children_capacity',
    turns: ['2 yetiskin 6 cocuk gelecegiz tek bungalov olur mu'],
    expect: 'Kapasiteyi asan cocuk sayisini tek odada garanti etmez; daha buyuk/ekip kontrolu ister.',
  },
  {
    id: 'customer_corrects_guest_count',
    turns: ['2 yetiskin gelecegiz 10-12 Agustos', 'Aslinda 4 yetiskin olacagiz'],
    expect: 'Duzeltilen kisi sayisini dikkate alir; 2 kisilik odaya devam etmez.',
  },
  {
    id: 'ask_all_options_explicit',
    turns: ['Tum bungalovlari tek mesajda kisa kisa atar misiniz'],
    expect: 'Musteri acikca tumunu istediyse kisa toplu ozet verebilir; uzun katalog dokmez.',
  },
  {
    id: 'service_dog',
    turns: ['Rehber kopegim var engelli misafirim evcil hayvan gibi degil kabul olur mu'],
    expect: 'Rehber kopek/erisilebilirlik konusunda yasal/politika uydurmaz; ekibe devreder.',
  },
  {
    id: 'card_payment_installment',
    turns: ['Kredi karti taksit oluyor mu online odeme linki var mi'],
    expect: 'Kart/taksit/odeme linki bilgisini uydurmaz; resmi odeme bilgisine yonlendirir.',
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
const jsonPath = path.join(root, 'reports', `receptionist-batch3-${stamp}.json`);
const mdPath = path.join(root, 'reports', `receptionist-batch3-${stamp}.md`);
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(mdPath, renderMarkdown(report), 'utf8');

console.log(`Batch3 report: ${path.relative(root, mdPath).replace(/\\/g, '/')}`);
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
        id: `B3-${idPrefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
      pushName: 'Batch3 Test',
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
  const last = turns.at(-1)?.assistant || '';
  const n = norm(text);
  const lastN = norm(last);
  const checks = [
    { name: 'has_response', ok: turns.every((turn) => String(turn.assistant || '').trim().length > 0) },
    { name: 'not_too_long', ok: turns.every((turn) => String(turn.assistant || '').length <= 500) },
    { name: 'not_generic_ai_close', ok: !/(baska bir soru|nasil yardimci|yardimci olabilir)/.test(n) },
    { name: 'no_payment_fabrication', ok: !/(iban|kapora|depozito|odeme linki|ödeme linki).*\b\d{3,}/i.test(n) },
  ];

  if (scenario.id === 'multi_turn_collect_then_present') {
    checks.push({ name: 'does_not_repeat_known_info', ok: !/(kac yetiskin|kaç yetişkin|hangi tarihler|giris cikis.*yazar misiniz)/.test(lastN) });
    checks.push({ name: 'presents_or_checks_option', ok: /(uygun|oda|bungalov|kontrol|gecelik|secenek)/.test(lastN) });
  }
  if (scenario.id === 'reserve_without_dates') {
    checks.push({ name: 'no_reservation_created_claim', ok: !/(rezervasyon.*olusturuldu|rezervasyon no|ayirttim|ayırtıldı|kaydedildi)/.test(n) });
    checks.push({ name: 'asks_missing_info', ok: /(tarih|giris|cikis|kisi|oda|net)/.test(n) });
  }
  if (scenario.id === 'late_arrival_key') {
    checks.push({ name: 'no_key_pickup_fabrication', ok: !/(anahtar.*(birakilir|bırakılır|resepsiyondan alirsiniz|şifre|sifre)|gece giris.*sorun olmaz)/.test(n) });
    checks.push({ name: 'team_or_check', ok: /(ekip|net|kontrol|sor|paylas)/.test(n) });
  }
  if (scenario.id === 'min_stay_checkout_times') {
    checks.push({ name: 'mentions_times_or_min_stay', ok: /(14:00|12:00|1 gece|min)/.test(n) });
  }
  if (scenario.id === 'children_without_adult') {
    checks.push({ name: 'no_child_only_booking', ok: !/(oda tutabilir|rezervasyon yapabilir|uygun gorunuyor)/.test(n) });
    checks.push({ name: 'asks_adult_or_team', ok: /(yetiskin|veli|ekip|net|kontrol)/.test(n) });
  }
  if (scenario.id === 'many_children_capacity') {
    checks.push({ name: 'no_capacity_guarantee', ok: !/(tek bungalov olur|uygun gorunuyor|kalabilirsiniz)/.test(n) });
    checks.push({ name: 'capacity_or_team', ok: /(kapasite|cocuk|ekip|net|kontrol|premium|aile)/.test(n) });
  }
  if (scenario.id === 'customer_corrects_guest_count') {
    checks.push({ name: 'does_not_continue_two_person_room', ok: !/(romantik deluxe.*2 yetiskin|kapasite: 2 yetiskin)/.test(lastN) });
    checks.push({ name: 'acknowledges_or_uses_four_adults', ok: /(4 yetiskin|dort yetiskin|aile suit|premium villa|kapasite)/.test(lastN) });
  }
  if (scenario.id === 'ask_all_options_explicit') {
    checks.push({ name: 'can_show_multiple_when_explicit', ok: countRooms(lastN) >= 2 });
    checks.push({ name: 'still_not_too_long', ok: last.length <= 500 });
  }
  if (scenario.id === 'service_dog') {
    checks.push({ name: 'does_not_invent_service_dog_policy', ok: !/(kabul ediyoruz|kabul etmiyoruz|serbest|yasak)/.test(n) });
    checks.push({ name: 'handoff_or_team', ok: /(ekip|net|kontrol|erisilebilir|rehber|yetkili)/.test(n) });
  }
  if (scenario.id === 'card_payment_installment') {
    checks.push({ name: 'no_payment_method_overpromise', ok: !/(taksit oluyor|online odeme linki var|kredi karti kabul)/.test(n) });
    checks.push({ name: 'official_or_team', ok: /(resmi|ekip|odeme|ödeme|net|kontrol|paylas)/.test(n) });
  }
  return checks;
}

function countRooms(text) {
  return ['romantik deluxe', 'aile suit', 'premium villa'].filter((room) => text.includes(room)).length;
}

function norm(text) {
  return String(text || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0131/g, 'i').replace(/\s+/g, ' ').trim();
}

function renderMarkdown(items) {
  const lines = ['# Receptionist Batch 3 Live Scenario Report', '', `Generated: ${new Date().toISOString()}`, ''];
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
