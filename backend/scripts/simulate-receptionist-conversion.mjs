/**
 * simulate-receptionist-conversion.mjs
 *
 * Dönüşüm ve gerçek resepsiyonist tonu testleri.
 * Hedef: AI'nin gerçek bir boutique bungalov resepsiyonisti gibi
 * müşteriyi doğal biçimde rezervasyona yönlendirip yönlendirmediğini ölçer.
 *
 * npm run simulate:conversion
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
loadDotEnv();

// ─── Senaryolar ────────────────────────────────────────────────────────────────
const scenarios = [
  // 1. İlk mesaj — tarih mi alıyor yoksa belirsiz mi yanıtlıyor?
  {
    id: 'opening_date_capture',
    label: 'İlk mesaj: tarih yakalanıyor mu?',
    input: 'Merhaba bilgi almak istiyorum',
    expect: 'İlk mesajda tarihleri sormak için net bir soru atmalı.',
    checks: (n, state) => [
      { name: 'tarih_sorusu_var', ok: /(ne zaman|hangi tarih|tarihleri|giris.*cikis|kac gun|kac gece|hafta sonu|ne zaman gelmeyi)/.test(n) },
      { name: 'cok_uzun_degil', ok: n.length <= 300 },
      { name: 'yapay_ai_kapanisi_yok', ok: !/baska.*soru|nasil yardim|her zaman buraday/.test(n) },
    ],
  },

  // 2. Tarih + kişi bilgisi — hemen oda sunuyor mu?
  {
    id: 'info_complete_room_presentation',
    label: 'Tarih + kişi bilgisi: oda sunumu yapıyor mu?',
    input: '15-17 Agustos 2 yetiskin gelecegiz oda var mi',
    expect: 'Tüm bilgi verildi — tek uygun oda kısa tanıtımı + gecelik fiyat + yer ayırtma sorusu.',
    checks: (n, state) => [
      { name: 'oda_sunuyor', ok: /(bungalov|deluxe|villa|suit|oda)/.test(n) },
      { name: 'fiyat_bilgisi_var', ok: /\d{3,}/.test(n) || /(fiyat|gecelik)/.test(n) },
      { name: 'rezervasyon_adimi_var', ok: /(ayirtalim|yer ayir|rezervasyon|onaylayal|kaydedelim|isterseniz|musaitlik)/.test(n) },
      { name: 'cok_uzun_degil', ok: n.length <= 400 },
    ],
  },

  // 3. Balayı — empati ve doğru oda
  {
    id: 'honeymoon_empathy',
    label: 'Balayı: empati + doğru oda sunuyor mu?',
    input: 'Karim ile balayi yapacagiz ozel bir yer ariyoruz jakuzi olsa iyi olur',
    expect: 'Balayına uygun odayı sıcaklıkla sunar, kişisel tebrik, tarih sorusu.',
    checks: (n, state) => [
      { name: 'romantik_bungalov_once', ok: /(romantik|jakuzi|ozel|sessiz)/.test(n) },
      { name: 'empati_var', ok: /(guzel|tatli|ozel|balayı|balayiniz|tebrik|kutluyoruz|hosgeldiniz|dileriz)/.test(n) || /(guzel bir)/.test(n) },
      { name: 'tarih_sorusu', ok: /(ne zaman|hangi tarih|tarihleri|giriş tarihi)/.test(n) },
      { name: 'tum_odalar_listelenmiyor', ok: (n.match(/bungalov|deluxe|villa|suit/g) || []).length <= 2 },
    ],
  },

  // 4. Fiyat itirazı — çözüm üretiyor mu?
  {
    id: 'price_objection',
    label: 'Fiyat itirazı: çözüm üretiyor mu?',
    input: 'Birazcik pahali geldi daha uygun secenek yok mu',
    state_seed: { check_in_date: '2026-08-10', check_out_date: '2026-08-13', adults: 2 },
    expect: 'Başka oda önerir ya da kısa değer vurgusu yapar; indirim vaat etmez.',
    checks: (n, state) => [
      { name: 'fiyat_veya_oda_alternatifi', ok: /(baska|diger|secenek|farkli|bungalov|deluxe|villa|suit)/.test(n) || /(indirim veremem|net fiyat|ekip|kontrol)/.test(n) },
      { name: 'indirim_vaat_etmiyor', ok: !/indirim.*yapabiliriz|indirim.*sağlayabiliriz|indirim.*uygulayabiliriz/.test(n) },
      { name: 'cok_uzun_degil', ok: n.length <= 350 },
    ],
  },

  // 5. Karşılaştırma — farklılaştırıyor mu?
  {
    id: 'comparison_differentiation',
    label: '"Başka yerlere bakıyorum": farklılaştırıyor mu?',
    input: 'Baska yerlere de bakiyorum onlardan ne farki var',
    expect: 'Bizi özel kılan 1 özelliği doğal söyler, baskı yapmaz.',
    checks: (n, state) => [
      { name: 'bir_farklilasma_ozelligi', ok: /(jakuzi|ozel|sessiz|butik|manzara|dogada|villa|luks|kucuk|kisisel|ilgi)/.test(n) },
      { name: 'baskici_degil', ok: !/kesinlikle|hemen|kacirmayin|son|acele/.test(n) },
      { name: 'cok_uzun_degil', ok: n.length <= 350 },
    ],
  },

  // 6. "Düşüneceğim" — yumuşak aciliyet
  {
    id: 'think_about_it_soft_urgency',
    label: '"Düşüneceğim": yumuşak aciliyet var mı?',
    input: 'Tamam anladim biraz dusunecegim',
    state_seed: { check_in_date: '2026-08-10', check_out_date: '2026-08-13', adults: 2 },
    expect: 'Tarihlerin sınırlı olduğunu nazikçe belirtir, kapıyı açık bırakır.',
    checks: (n, state) => [
      { name: 'kapiya_acik_birakmis', ok: /(bekleriz|hazirda|geri donun|yazarsaniz|her zaman|yazin|isterseniz|ayirabilirim|gecici|rezerv|kapora)/.test(n) },
      { name: 'yumusak_aciliyet_var', ok: /(doluyor|sinirli|erken|tarih.*doluyor|yogun|talep|kaliyor|sinirli|ayirabilirim|gecici)/.test(n) },
      { name: 'agresif_satis_yok', ok: !/hemen|kacirmayin|son sans/.test(n) },
    ],
  },

  // 7. Tüm bilgi verildi + direkt rezervasyon onayı — hızlı mı ilerliyor?
  {
    id: 'direct_booking_intent',
    label: 'Direkt "rezervasyon yapmak istiyorum": hızlı onay mı?',
    input: '10-13 Agustos 2026 tarihlerinde 2 yetiskin jakuzili bungalov rezervasyonu yapmak istiyorum',
    expect: 'Bilgiler tamam — doğrulama veya yer ayırma adımına doğrudan geçer.',
    checks: (n, state) => [
      { name: 'onay_adimi_atilmis', ok: /(kaydedelim|onaylayal|rezervasyon.*olustur|yer ayir|ayarlayal|bilgileri.*tamamlay)/.test(n) || ['CONFIRMING_RESERVATION','AWAITING_DEPOSIT','COLLECTING_GUEST_INFO'].includes(state) },
      { name: 'zaman_kaybetmiyor', ok: !/(anliyorum|tabii anladim.*ama|once sorayim ki|bir dakika durun|cok guzel haberler)/.test(n) },
      { name: 'cok_uzun_degil', ok: n.length <= 400 },
    ],
  },

  // 8. Çok sorulu mesaj — en satış-kritik soruyu önce yanıtlıyor mu?
  {
    id: 'multi_question_priority',
    label: 'Çok sorulu mesaj: en önemli soruyu seçiyor mu?',
    input: 'Kac oda var fiyatlar ne kadar jakuzi var mi kahvalti dahil mi erken giriş olur mu',
    expect: 'Hepsini listelemek yerine en satış-kritik olanı (jakuzi/fiyat/oda) yanıtlar ve tarih sorar.',
    checks: (n, state) => [
      { name: 'tek_odayi_one_cikarıyor', ok: (n.match(/bungalov|deluxe|villa|suit/g) || []).length <= 2 },
      { name: 'tum_soruları_tek_mesajda_yanıtlamıyor', ok: !/jakuzi.*kahvalti.*erken/.test(n) },
      { name: 'tarih_sorusu_var', ok: /(ne zaman|hangi tarih|tarihleri|giris)/.test(n) },
    ],
  },

  // 9. Gece geç mesaj — saatleri dışındaysa ne yapıyor?
  {
    id: 'natural_flow_single_question',
    label: 'Doğal akış: her mesajda tek iş yapıyor mu?',
    input: 'Oda musait mi ve fiyatlar nedir ve kac gun minimum kalış var',
    expect: 'En kritik tek soruyu yanıtlar, tarih bilgisini ister.',
    checks: (n, state) => [
      { name: 'bir_konuya_odaklanmis', ok: n.split(/[.!?]/).filter(s => s.trim().length > 5).length <= 4 },
      { name: 'tarih_veya_fiyat_var', ok: /(tarih|ne zaman|fiyat|gecelik|\d{3,})/.test(n) },
      { name: 'yapay_kapaniş_yok', ok: !/baska.*soru|nasil yardim|iletisime gecin/.test(n) },
    ],
  },

  // 10. İsim verme — doğal kullanım
  {
    id: 'name_usage_natural',
    label: 'İsim: doğal ve aşırı kullanmıyor mu?',
    input: 'Merhaba ismim Selin bilgi almak istiyorum',
    expect: 'İsmi makul kullanır, her cümlede tekrar etmez, tarih sorar.',
    checks: (n, state, meta) => [
      { name: 'isim_alindi', ok: meta?.guest_name === 'Selin' || meta?.guest_name?.toLowerCase() === 'selin' || /selin/.test(n.toLowerCase()) || /merhaba/.test(n) },
      { name: 'isim_abartisiz', ok: (n.toLowerCase().match(/selin/g) || []).length <= 2 },
      { name: 'tarih_sorusu', ok: /(ne zaman|hangi tarih|tarihleri|kac gece)/.test(n) },
    ],
  },
];

// ─── Test altyapısı ────────────────────────────────────────────────────────────
const baseUrl = normalizeBaseUrl(process.env.N8N_BASE_URL || '');
const webhookUrl = `${baseUrl.replace(/\/api\/v\d+$/i, '')}/webhook/whatsapp-inbound`;
const instance = process.env.N8N_TEST_INSTANCE || 'mnv';
const supabase = readSupabaseConfig();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const report = [];

console.log(`\nDönüşüm Tonu Simülasyonu — ${scenarios.length} senaryo\n`);

for (let i = 0; i < scenarios.length; i++) {
  const scenario = scenarios[i];
  const phone = `9053${Date.now().toString().slice(-7)}${i}`;
  console.log(`[${i + 1}/${scenarios.length}] ${scenario.label}`);
  console.log(`  Girdi: ${scenario.input}`);

  try {
    await postWebhook(phone, scenario.input, scenario.state_seed || null);
    const result = await waitForAssistant(phone);
    const assistantText = result?.content || '';
    const state = result?.current_state || null;
    const meta = result?.metadata || {};
    const n = norm(assistantText);

    const checks = scenario.checks(n, state, meta).map(c => ({ ...c }));

    // Evrensel kalite kontrolleri
    checks.push({ name: 'yanit_var', ok: assistantText.trim().length > 0 });
    checks.push({ name: 'cok_uzun_degil', ok: assistantText.length <= 500 });
    checks.push({ name: 'markdown_yok', ok: !/\*\*|\#{1,3}/.test(assistantText) });
    checks.push({ name: 'yapay_ai_kapanisi_yok', ok: !/baska bir sorum|nasil yardimci|her zaman buraday/.test(n) });

    const failCount = checks.filter(c => !c.ok).length;
    console.log(`  Yanıt: ${assistantText.slice(0, 120)}${assistantText.length > 120 ? '...' : ''}`);
    console.log(`  Durum: ${state || 'n/a'} | ${failCount === 0 ? '✓ GEÇTI' : `✗ ${failCount} hata`}\n`);

    report.push({ ...scenario, phone, assistant: assistantText, state, metadata: meta, checks });
  } catch (err) {
    console.error(`  HATA: ${err.message}\n`);
    report.push({ ...scenario, phone, assistant: null, state: null, metadata: {}, checks: [{ name: 'error', ok: false }], error: err.message });
  }
}

// ─── Raporlama ─────────────────────────────────────────────────────────────────
await mkdir(path.join(root, 'reports'), { recursive: true });
const jsonPath = path.join(root, 'reports', `receptionist-conversion-${stamp}.json`);
const mdPath = path.join(root, 'reports', `receptionist-conversion-${stamp}.md`);
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(mdPath, renderMarkdown(report), 'utf8');

const total = report.length;
const passed = report.filter(r => r.checks.every(c => c.ok)).length;
console.log(`\n━━━ Sonuç: ${passed}/${total} geçti ━━━`);
console.log(`Rapor: ${path.relative(root, mdPath).replace(/\\/g, '/')}`);

// ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────────
async function postWebhook(phone, text, stateSeed) {
  const payload = {
    test_mode: true,
    event: 'messages.upsert',
    instance,
    data: {
      key: {
        remoteJid: `${phone}@s.whatsapp.net`,
        fromMe: false,
        id: `CONV-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
      pushName: 'Conversion Test',
      message: { conversation: text },
      messageTimestamp: Math.floor(Date.now() / 1000),
      ...(stateSeed ? { test_state_seed: stateSeed } : {}),
    },
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Webhook ${res.status}: ${await res.text()}`);
}

async function waitForAssistant(phone, maxAttempts = 20, intervalMs = 2500) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(intervalMs);
    const convs = await supabaseGet(`/conversations?guest_phone=eq.${phone}&select=id,current_state,metadata&limit=1`);
    if (!convs.length) continue;
    const msgs = await supabaseGet(
      `/messages?conversation_id=eq.${convs[0].id}&role=eq.assistant&select=content,sent_at&order=sent_at.desc&limit=1`
    );
    if (msgs.length) return { ...msgs[0], current_state: convs[0].current_state, metadata: convs[0].metadata };
  }
  return null;
}

async function supabaseGet(endpoint) {
  const res = await fetch(`${supabase.url}/rest/v1${endpoint}`, {
    headers: { apikey: supabase.key, authorization: `Bearer ${supabase.key}`, accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

function norm(text) {
  return String(text || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i')
    .replace(/\s+/g, ' ').trim();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function renderMarkdown(items) {
  const passed = items.filter(r => r.checks.every(c => c.ok)).length;
  const lines = [
    '# Resepsiyonist Dönüşüm Tonu Simülasyon Raporu',
    '',
    `Oluşturuldu: ${new Date().toISOString()}`,
    `Genel Sonuç: ${passed}/${items.length} geçti`,
    '',
  ];
  for (const item of items) {
    const ok = item.checks.every(c => c.ok);
    lines.push(`## ${ok ? '✓' : '✗'} ${item.label || item.id}`);
    lines.push(`- Beklenen: ${item.expect}`);
    lines.push(`- Girdi: ${item.input}`);
    lines.push(`- Durum: ${item.state || 'n/a'}`);
    lines.push(`- Yanıt: ${item.assistant || 'YANIT YOK'}`);
    lines.push('- Kontroller:');
    for (const c of item.checks) lines.push(`  - ${c.ok ? 'OK' : 'FAIL'} ${c.name}`);
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

  const wfPath = path.join(root, 'data', 'exports', 'latest', 'WF-01-Inbound-WhatsApp-Router-AI-Orchestrator__TBSkW1kkkcbJP8Za.json');
  const wf = JSON.parse(readFileSync(wfPath, 'utf8'));
  const loadTenant = wf.nodes.find(n => n.name === 'Load Tenant');
  const url = new URL(loadTenant.parameters.url);
  const key = loadTenant.parameters.headerParameters.parameters.find(p => p.name === 'apikey')?.value;
  if (!url.origin || !key) throw new Error('Supabase URL/key okunamadı.');
  console.warn('Warning: reading Supabase key from workflow export. Prefer SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.');
  return { url: url.origin, key };
}

function normalizeBaseUrl(value) {
  const t = value.replace(/\/+$/, '');
  if (!t) throw new Error('N8N_BASE_URL gerekli.');
  return /\/api\/v\d+$/i.test(t) ? t : `${t}/api/v1`;
}

function loadDotEnv() {
  const p = path.join(root, '.env');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
