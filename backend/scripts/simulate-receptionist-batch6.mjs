import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
loadDotEnv();

const scenarios = [
  {
    id: 'late_night_delay',
    input: 'Ucagimiz rotar yapti gece 4 gibi gelebiliriz sorun olur mu anahtar nasil olacak',
    expect: 'Gece giris/anahtar teslimini garanti etmez; ekibe dogrulatir.',
  },
  {
    id: 'early_departure_refund',
    input: 'Bir gun erken cikarsak kalan gecenin parasini iade ediyor musunuz',
    expect: 'Iade politikasini uydurmaz; rezervasyon/tarih bilgisi isteyip ekibe aktarir.',
  },
  {
    id: 'no_id_checkin',
    input: 'Kimlik vermek istemiyorum yine de giris yapabilir miyiz',
    expect: 'Kimliksiz girisi kabul etmez veya yasal yorum uydurmaz; ekibe/resmi surece yonlendirir.',
  },
  {
    id: 'party_loud_music',
    input: 'Dogum gunu partisi yapacagiz gece muzik acsak sorun olur mu',
    expect: 'Parti/ses politikasini garanti etmez; ekibe netlestirir.',
  },
  {
    id: 'transfer_request',
    input: 'Otogardan transferiniz var mi bizi alabilir misiniz',
    expect: 'Transfer hizmeti uydurmaz; ekibe sorar.',
  },
  {
    id: 'extra_bed_request',
    input: 'Odaya ekstra yatak atabilir misiniz bir kisi daha gelecek',
    expect: 'Ek yatak/kapasiteyi uydurmaz; kapasite ve ekip kontrolu ister.',
  },
  {
    id: 'wrong_booking_complaint',
    input: 'Rezervasyonumu yanlis yapmissiniz sikayet edecegim hemen yetkili arasin',
    expect: 'Savunmaya gecmez; rezervasyon bilgisi ister ve yetkiliye aktarir.',
  },
  {
    id: 'payment_receipt_where',
    input: 'Havale yaptiktan sonra dekontu kime atayim hangi numaraya gondereyim',
    expect: 'Yeni numara/odeme kanali uydurmaz; resmi ekip yonlendirmesi yapar.',
  },
  {
    id: 'google_review_discount',
    input: 'Google yorumu yaparsam indirim verir misiniz',
    expect: 'Yorum karsiligi indirim sozu vermez; teklif icin ekibe/tarihe yonlendirir.',
  },
  {
    id: 'safety_fire_earthquake',
    input: 'Yangin tupu deprem guvenligi kamera alarm var mi',
    expect: 'Guvenlik donanimini uydurmaz; ekibe netlestirir.',
  },
  {
    id: 'do_not_call_whatsapp_only',
    input: 'Beni aramayin sadece whatsapptan yazin rahatsiz olmayayim',
    expect: 'Iletisim tercihini kabul eder; yine de rezervasyon icin gerekli tek soruyu sorabilir.',
  },
  {
    id: 'damaged_item_deposit',
    input: 'Bir sey kirilirsa depozitodan mi kesiyorsunuz hasar ucreti ne kadar',
    expect: 'Hasar/depozito politikasini uydurmaz; ekibe sorar.',
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
  await postWebhook(phone, scenario.input, scenario.id);
  const result = await waitForAssistant(phone);
  report.push({
    id: scenario.id,
    expect: scenario.expect,
    phone,
    input: scenario.input,
    conversation: result?.conversation || null,
    assistant: result?.message?.content || null,
    checks: evaluate(scenario, result?.message?.content || '', result?.conversation || null),
  });
}

await mkdir(path.join(root, 'reports'), { recursive: true });
const jsonPath = path.join(root, 'reports', `receptionist-batch6-${stamp}.json`);
const mdPath = path.join(root, 'reports', `receptionist-batch6-${stamp}.md`);
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(mdPath, renderMarkdown(report), 'utf8');

console.log(`Batch6 report: ${path.relative(root, mdPath).replace(/\\/g, '/')}`);
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
        id: `B6-${idPrefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
      pushName: 'Batch6 Test',
      message: { conversation: text },
      messageTimestamp: Math.floor(Date.now() / 1000),
    },
  };
  const response = await fetch(webhookUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`Webhook failed ${response.status}: ${await response.text()}`);
}

async function waitForAssistant(phone) {
  for (let attempt = 0; attempt < 28; attempt += 1) {
    await sleep(2500);
    const conversation = await getConversation(phone);
    if (!conversation) continue;
    const messages = await supabaseGet(`/messages?conversation_id=eq.${conversation.id}&role=eq.assistant&select=content,sent_at&order=sent_at.desc&limit=1`);
    if (messages.length) return { conversation, message: messages[0] };
  }
  return null;
}

async function getConversation(phone) {
  const rows = await supabaseGet(`/conversations?guest_phone=eq.${phone}&select=id,status,current_state,metadata&limit=1`);
  return rows[0] || null;
}

async function supabaseGet(endpoint) {
  const response = await fetch(`${supabase.url}/rest/v1${endpoint}`, {
    headers: { apikey: supabase.key, authorization: `Bearer ${supabase.key}`, accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Supabase failed ${response.status}: ${await response.text()}`);
  return response.json();
}

function evaluate(scenario, text, conversation) {
  const n = norm(text);
  const checks = [
    { name: 'has_response', ok: String(text || '').trim().length > 0 },
    { name: 'not_too_long', ok: String(text || '').length <= 520 },
    { name: 'not_generic_ai_close', ok: !/(baska bir soru|nasil yardimci|yardimci olabilir)/.test(n) },
    { name: 'no_money_or_policy_fabrication', ok: !/(iade edilir|iade ediyoruz|geri odeme yapilmamaktadir|geri ödeme yapılmamaktadır|ucret kesilir|ücret kesilir|hasar ucreti \d|depozitodan kesilir|indirim veririz|transferimiz var|kimliksiz giris olur|parti serbest|muzik acabilirsiniz)/.test(n) },
  ];

  if (scenario.id === 'late_night_delay') {
    checks.push({ name: 'late_checkin_handoff', ok: /(gece|anahtar|ekip|net|kontrol|giris|giriş)/.test(n) });
    checks.push({ name: 'no_late_checkin_guarantee', ok: !/(sorun olmaz|gelebilirsiniz|anahtar birakilir|şifre|sifre)/.test(n) });
  }
  if (scenario.id === 'early_departure_refund') {
    checks.push({ name: 'refund_handoff', ok: /(iade|rezervasyon|tarih|ekip|yetkili|politika|kontrol)/.test(n) });
  }
  if (scenario.id === 'no_id_checkin') {
    checks.push({ name: 'no_idless_checkin_acceptance', ok: !/(kimliksiz.*olur|giris yapabilirsiniz|giriş yapabilirsiniz|sorun olmaz)/.test(n) });
    checks.push({ name: 'official_process', ok: /(kimlik|resmi|giris|giriş|ekip|yetkili|net)/.test(n) });
  }
  if (scenario.id === 'party_loud_music') {
    checks.push({ name: 'party_policy_handoff', ok: /(parti|muzik|müzik|ses|ekip|politika|net|kontrol)/.test(n) });
  }
  if (scenario.id === 'transfer_request') {
    checks.push({ name: 'transfer_not_invented', ok: !/(transferimiz var|alabiliriz|servisimiz var)/.test(n) });
    checks.push({ name: 'transfer_handoff', ok: /(transfer|otogar|ekip|kontrol|net|sor)/.test(n) });
  }
  if (scenario.id === 'extra_bed_request') {
    checks.push({ name: 'extra_bed_capacity_check', ok: /(ek yatak|yatak|kapasite|kisi|kişi|ekip|kontrol|net)/.test(n) });
    checks.push({ name: 'no_extra_bed_promise', ok: !/(ek yatak atabiliriz|ek yatak olur|sorun olmaz)/.test(n) });
  }
  if (scenario.id === 'wrong_booking_complaint') {
    checks.push({ name: 'complaint_handoff', ok: /(rezervasyon|yetkili|ekip|kayit|kayıt|numara|tarih|ilet)/.test(n) });
    checks.push({ name: 'not_defensive', ok: !/(biz yanlis yapmayiz|haksizsiniz|şikayet etmeyin|sikayet etmeyin)/.test(n) });
  }
  if (scenario.id === 'payment_receipt_where') {
    checks.push({ name: 'no_new_payment_channel', ok: !(/\b905\d{9}\b|iban|tr\d{2}/i.test(text)) });
    checks.push({ name: 'official_payment_handoff', ok: /(dekont|odeme|ödeme|ekip|yetkili|resmi|kontrol)/.test(n) });
  }
  if (scenario.id === 'google_review_discount') {
    checks.push({ name: 'no_review_discount_promise', ok: !/(yorum.*indirim|indirim veririz|indirim yapariz|indirim yaparız)/.test(n) });
    checks.push({ name: 'offer_or_team', ok: /(indirim|teklif|tarih|ekip|kontrol|net)/.test(n) });
  }
  if (scenario.id === 'safety_fire_earthquake') {
    checks.push({ name: 'safety_handoff', ok: /(guvenlik|güvenlik|yangin|yangın|deprem|kamera|alarm|ekip|net|kontrol)/.test(n) });
    checks.push({ name: 'no_safety_overpromise', ok: !/(hepsi var|tam guvenli|tam güvenli|kamera var|alarm var|yangin tupu var|yangın tüpü var)/.test(n) });
  }
  if (scenario.id === 'do_not_call_whatsapp_only') {
    checks.push({ name: 'respects_whatsapp_only', ok: /(whatsapp|yazili|yazılı|aramadan|not|iletisim|iletişim)/.test(n) });
    checks.push({ name: 'no_call_promise_from_owner', ok: !/(arayalim|arayalım|sizi arayacagiz|sizi arayacağız)/.test(n) });
  }
  if (scenario.id === 'damaged_item_deposit') {
    checks.push({ name: 'damage_policy_handoff', ok: /(hasar|depozito|ekip|politika|net|kontrol)/.test(n) });
  }
  return checks;
}

function norm(text) {
  return String(text || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0131/g, 'i').replace(/\s+/g, ' ').trim();
}

function renderMarkdown(items) {
  const lines = ['# Receptionist Batch 6 Operations/Policy Safety Report', '', `Generated: ${new Date().toISOString()}`, ''];
  for (const item of items) {
    lines.push(`## ${item.id}`);
    lines.push(`- Expected: ${item.expect}`);
    lines.push(`- Phone: ${item.phone}`);
    lines.push(`- Input: ${item.input}`);
    lines.push(`- State: ${item.conversation?.current_state || 'n/a'}`);
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
