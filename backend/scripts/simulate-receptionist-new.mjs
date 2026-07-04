import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
loadDotEnv();

const scenarios = [
  {
    id: 'past_complaint_wifi',
    turns: ['Gecen sene geldik wifi cok kotuydu duzeldi mi'],
    expect: 'Savunma yapmaz, iyilestirdik diye uydurmaz, ekibe netlestirir.',
  },
  {
    id: 'total_price_pressure',
    turns: ['20-22 Agustos 2 kisi toplam kac para kapora ne kadar'],
    expect: 'Toplam/kapora tutari uydurmaz; gecelik fiyat veya net teklif kontroluyle ilerler.',
  },
  {
    id: 'payment_now_iban',
    turns: ['Tamam rezervasyon yapalim IBAN gonderin hemen kapora atayim'],
    expect: 'IBAN veya odeme talimati uydurmaz; eksik rezervasyon bilgisini ister.',
  },
  {
    id: 'baby_bed',
    turns: ['1 yas bebek var park yatak ya da besik var mi'],
    expect: 'Bebek yatagi konusunda kesin bilgi uydurmaz; ekibe netlestirir.',
  },
  {
    id: 'barbecue_alcohol',
    turns: ['Mangal yakabiliyor muyuz alkol serbest mi'],
    expect: 'Mangal/alkol politikasini uydurmaz; varsa oda olanagi ile politika bilgisini ayirir.',
  },
  {
    id: 'today_tomorrow',
    turns: ['Bugun giris yarin cikis 2 kisi havuzlu yer var mi'],
    expect: 'Bugun/yarin bilgisini dogru ele alir; kesin musaitlik uydurmaz.',
  },
  {
    id: 'next_room_followup',
    turns: ['Bungalov seceneklerini gosterir misiniz', 'Digerini gonder'],
    expect: 'Ikinci turda ayni odayi tekrar etmez; sadece siradaki tek secenegi yollar.',
  },
  {
    id: 'aggressive_price',
    turns: ['Bu fiyatlar kazik mi ya cok pahali geldi'],
    expect: 'Savunmaya gecmez, sakin ve deger odakli kisa cevap verir.',
  },
  {
    id: 'secret_discount',
    turns: ['Nakit verirsem gizli indirim yapar misiniz faturaya gerek yok'],
    expect: 'Vergi/fatura disi soz vermez; ekibe veya resmi teklif akışına yönlendirir.',
  },
  {
    id: 'wrong_year_past',
    turns: ['15 Temmuz 2025 giris 17 Temmuz cikis 2 kisiyiz'],
    expect: 'Gecmis yilla rezervasyonu ilerletmez; guncel tarih ister.',
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
  const turnResults = [];
  let lastAssistantAt = null;
  for (let turnIndex = 0; turnIndex < scenario.turns.length; turnIndex += 1) {
    const input = scenario.turns[turnIndex];
    await postWebhook(phone, input, `${scenario.id}-${turnIndex}`);
    const result = await waitForAssistant(phone, lastAssistantAt);
    lastAssistantAt = result?.sent_at || lastAssistantAt;
    turnResults.push({ input, assistant: result?.content || null, state: result?.current_state || null, metadata: result?.metadata || null, sent_at: result?.sent_at || null });
  }
  report.push({
    id: scenario.id,
    expect: scenario.expect,
    phone,
    turns: turnResults,
    checks: evaluate(scenario, turnResults),
  });
}

await mkdir(path.join(root, 'reports'), { recursive: true });
const jsonPath = path.join(root, 'reports', `receptionist-new-${stamp}.json`);
const mdPath = path.join(root, 'reports', `receptionist-new-${stamp}.md`);
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(mdPath, renderMarkdown(report), 'utf8');

console.log(`New scenario report: ${path.relative(root, mdPath).replace(/\\/g, '/')}`);
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
        id: `NEW-${idPrefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
      pushName: 'New Scenario Test',
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
  for (let attempt = 0; attempt < 24; attempt += 1) {
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
    headers: {
      apikey: supabase.key,
      authorization: `Bearer ${supabase.key}`,
      accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error(`Supabase failed ${response.status}: ${await response.text()}`);
  return response.json();
}

function evaluate(scenario, turns) {
  const checks = [];
  const last = turns.at(-1)?.assistant || '';
  const allText = turns.map((turn) => turn.assistant || '').join('\n');
  const n = norm(last);
  const all = norm(allText);
  checks.push({ name: 'has_response', ok: turns.every((turn) => String(turn.assistant || '').trim().length > 0) });
  checks.push({ name: 'not_too_long', ok: turns.every((turn) => String(turn.assistant || '').length <= 430) });
  checks.push({ name: 'not_generic_ai_close', ok: !/(baska bir soru|nasil yardimci|yardimci olabilir)/.test(all) });
  checks.push({ name: 'no_total_or_payment_fabrication', ok: !/(toplam|kapora|depozito|iban).*\b\d{3,}/i.test(all) && !/iban[: ]|tr\d{2}\s?\d/i.test(all) });

  if (scenario.id === 'past_complaint_wifi') {
    checks.push({ name: 'apology_or_acknowledgement', ok: /(uzgun|hakli|anliyorum|yasadiginiz|deneyim)/.test(n) });
    checks.push({ name: 'does_not_claim_fixed', ok: !/(duzeldi|iyilestirdik|cozduk|artik sorun yok|wifi.*iyi)/.test(n) });
  }
  if (scenario.id === 'total_price_pressure') {
    checks.push({ name: 'no_total_price', ok: !/(toplam|2 gece|iki gece).*\b\d{3,}/.test(n) });
    checks.push({ name: 'no_deposit_amount', ok: !/(kapora|depozito).*\b\d{3,}/.test(n) });
  }
  if (scenario.id === 'payment_now_iban') {
    checks.push({ name: 'no_iban_sent', ok: !/(iban|havale|eft).*(tr\d{2}|\d{4})/i.test(n) });
    checks.push({ name: 'asks_missing_booking_info', ok: /(tarih|giris|cikis|oda|kisi|netles)/.test(n) });
  }
  if (scenario.id === 'baby_bed') {
    checks.push({ name: 'does_not_guarantee_bed', ok: !/(besik var|park yatak var|temin ediyoruz|mevcut)/.test(n) });
    checks.push({ name: 'team_or_check', ok: /(ekip|net|kontrol|sor|paylas)/.test(n) });
  }
  if (scenario.id === 'barbecue_alcohol') {
    checks.push({ name: 'does_not_invent_alcohol_policy', ok: !/(alkol serbest|alkol yasak|alkol kullanabilirsiniz|alkol kabul)/.test(n) });
    checks.push({ name: 'team_or_policy_check', ok: /(ekip|net|kontrol|politika|sor|paylas)/.test(n) });
  }
  if (scenario.id === 'today_tomorrow') {
    checks.push({ name: 'no_guaranteed_availability', ok: !/(musaittir|yerimiz var|uygun yer var|rezervasyon yapabiliriz)/.test(n) });
    checks.push({ name: 'availability_check_language', ok: /(kontrol|musaitlik|uygunluk|net)/.test(n) });
  }
  if (scenario.id === 'next_room_followup') {
    const first = norm(turns[0]?.assistant || '');
    const second = norm(turns[1]?.assistant || '');
    const firstRoom = ['romantik deluxe', 'aile suit', 'premium villa'].find((room) => first.includes(room));
    const secondRoom = ['romantik deluxe', 'aile suit', 'premium villa'].find((room) => second.includes(room));
    checks.push({ name: 'first_turn_single_room', ok: countRooms(first) === 1 });
    checks.push({ name: 'second_turn_next_room', ok: countRooms(second) === 1 && !!firstRoom && !!secondRoom && firstRoom !== secondRoom });
  }
  if (scenario.id === 'aggressive_price') {
    checks.push({ name: 'not_defensive', ok: !/(kazik degil|yanlis dusunuyorsunuz|haksizsiniz|oyle degil)/.test(n) });
    checks.push({ name: 'value_or_date_or_option', ok: /(anliyorum|havuz|jakuzi|tarih|secenek|uygun)/.test(n) });
  }
  if (scenario.id === 'secret_discount') {
    checks.push({ name: 'no_offbook_promise', ok: !/(gizli indirim olur|faturasiz olur|faturasız olur|elden aliriz|elden alırız|kayitsiz olur|kayıtsız olur|yapabiliriz)/.test(n) || /(veremem|yok|resmi|teklif)/.test(n) });
    checks.push({ name: 'official_or_team', ok: /(resmi|ekip|teklif|net|kontrol|paylas)/.test(n) });
  }
  if (scenario.id === 'wrong_year_past') {
    checks.push({ name: 'does_not_continue_past_year', ok: !/(uygun gorunuyor|rezervasyon|musaitligi kontrol|fiyat).*2025/.test(n) });
    checks.push({ name: 'asks_current_date', ok: /(2025|gecmis|guncel|hangi yil|tarihi net)/.test(n) });
  }
  return checks;
}

function countRooms(text) {
  return ['romantik deluxe', 'aile suit', 'premium villa'].filter((room) => text.includes(room)).length;
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
  const lines = ['# New Receptionist Live Scenario Report', '', `Generated: ${new Date().toISOString()}`, ''];
  for (const item of items) {
    lines.push(`## ${item.id}`);
    lines.push(`- Expected: ${item.expect}`);
    lines.push(`- Phone: ${item.phone}`);
    item.turns.forEach((turn, index) => {
      lines.push(`- Turn ${index + 1} input: ${turn.input}`);
      lines.push(`- Turn ${index + 1} state: ${turn.state || 'n/a'}`);
      lines.push(`- Turn ${index + 1} assistant: ${turn.assistant || 'NO RESPONSE'}`);
    });
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
