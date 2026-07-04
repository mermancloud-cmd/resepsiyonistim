import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const supabase = readSupabaseConfig();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

const [tenants, instances, rooms, pricing, settings, faqs] = await Promise.all([
  supabaseGet('/tenants?select=id,slug,business_name,is_active,owner_phone,timezone,locale'),
  supabaseGet('/tenant_whatsapp_instances?select=tenant_id,instance_name,phone_number'),
  supabaseGet('/rooms?select=id,tenant_id,name,is_active,photo_urls,amenities,capacity_adults,capacity_children'),
  supabaseGet('/room_pricing?select=id,room_id,label,price_per_night,valid_from,valid_until'),
  supabaseGet('/tenant_settings?select=tenant_id,check_in_time,check_out_time,min_stay_nights,currency,deposit_percentage,cancellation_policy,business_hours_start,business_hours_end,openai_model,ai_persona_name'),
  supabaseGet('/faqs?select=tenant_id,is_active,question,answer'),
]);

const report = tenants.map((tenant) => assessTenant(tenant));

await mkdir(path.join(root, 'reports'), { recursive: true });
const jsonPath = path.join(root, 'reports', `supabase-onboarding-${stamp}.json`);
const mdPath = path.join(root, 'reports', `supabase-onboarding-${stamp}.md`);
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(mdPath, renderMarkdown(report), 'utf8');

console.log(`Onboarding report: ${path.relative(root, mdPath).replace(/\\/g, '/')}`);
for (const item of report) {
  console.log(`${item.readyForPilot ? 'PILOT_OK' : 'NOT_READY'} ${item.businessName}: critical=${item.counts.critical}, warning=${item.counts.warning}`);
}
if (report.some((item) => item.counts.critical > 0)) process.exitCode = 1;

function assessTenant(tenant) {
  const tenantInstances = instances.filter((item) => item.tenant_id === tenant.id);
  const tenantRooms = rooms.filter((item) => item.tenant_id === tenant.id && item.is_active === true);
  const tenantSettings = settings.find((item) => item.tenant_id === tenant.id);
  const tenantFaqs = faqs.filter((item) => item.tenant_id === tenant.id && item.is_active === true);
  const roomIds = new Set(tenantRooms.map((room) => room.id));
  const tenantPricing = pricing.filter((item) => roomIds.has(item.room_id));
  const issues = [];

  requireField(issues, 'critical', tenant.business_name, 'tenant.business_name eksik');
  requireField(issues, 'critical', tenant.slug, 'tenant.slug eksik');
  requireField(issues, 'critical', tenant.is_active === true, 'tenant aktif değil');
  requireField(issues, 'warning', tenant.owner_phone, 'tenant.owner_phone eksik; insan devri zayıflar');
  requireField(issues, 'warning', tenant.timezone, 'tenant.timezone eksik');
  requireField(issues, 'warning', tenant.locale, 'tenant.locale eksik');

  requireField(issues, 'critical', tenantInstances.length > 0, 'WhatsApp instance kaydı yok');
  for (const instance of tenantInstances) {
    requireField(issues, 'critical', instance.instance_name, 'WhatsApp instance_name eksik');
    requireField(issues, 'warning', instance.phone_number, `WhatsApp phone_number eksik: ${instance.instance_name || 'unknown'}`);
  }

  requireField(issues, 'critical', tenantSettings, 'tenant_settings kaydı yok');
  if (tenantSettings) {
    requireField(issues, 'warning', tenantSettings.ai_persona_name, 'ai_persona_name eksik');
    requireField(issues, 'critical', tenantSettings.currency, 'currency eksik');
    requireField(issues, 'warning', tenantSettings.check_in_time, 'check_in_time eksik');
    requireField(issues, 'warning', tenantSettings.check_out_time, 'check_out_time eksik');
    requireField(issues, 'warning', tenantSettings.min_stay_nights !== null && tenantSettings.min_stay_nights !== undefined, 'min_stay_nights eksik');
    requireField(issues, 'warning', tenantSettings.business_hours_start && tenantSettings.business_hours_end, 'business hours eksik');
    requireField(issues, 'warning', tenantSettings.cancellation_policy, 'cancellation_policy eksik; iptal soruları ekibe düşer');
    requireField(issues, 'warning', tenantSettings.deposit_percentage !== null && tenantSettings.deposit_percentage !== undefined, 'deposit_percentage eksik');
  }

  requireField(issues, 'critical', tenantRooms.length > 0, 'aktif oda yok');
  for (const room of tenantRooms) {
    requireField(issues, 'critical', room.name, `oda adı eksik: ${room.id}`);
    requireField(issues, 'critical', Number(room.capacity_adults || 0) > 0, `adult kapasitesi eksik: ${room.name || room.id}`);
    requireField(issues, 'warning', Array.isArray(room.amenities) && room.amenities.length > 0, `amenities eksik: ${room.name || room.id}`);
    requireField(issues, 'warning', Array.isArray(room.photo_urls) && room.photo_urls.length > 0, `photo_urls eksik: ${room.name || room.id}`);
    const roomPricing = tenantPricing.filter((item) => item.room_id === room.id);
    requireField(issues, 'critical', roomPricing.length > 0, `fiyat kaydı yok: ${room.name || room.id}`);
    for (const price of roomPricing) {
      requireField(issues, 'critical', Number(price.price_per_night || 0) > 0, `price_per_night geçersiz: ${room.name || room.id}`);
      requireField(issues, 'warning', price.label, `price label eksik: ${room.name || room.id}`);
    }
  }

  requireField(issues, 'warning', tenantFaqs.length >= 5, `aktif SSS/politika sayısı düşük (${tenantFaqs.length}); politika soruları ekibe düşer`);
  const faqText = tenantFaqs.map((item) => `${item.question || ''} ${item.answer || ''}`).join(' ').toLocaleLowerCase('tr-TR');
  for (const topic of ['iptal', 'kahvaltı', 'evcil', 'konum', 'ödeme']) {
    requireField(issues, 'warning', faqText.includes(topic), `SSS/politika konusu eksik olabilir: ${topic}`);
  }

  const counts = {
    critical: issues.filter((issue) => issue.severity === 'critical').length,
    warning: issues.filter((issue) => issue.severity === 'warning').length,
  };

  return {
    tenantId: tenant.id,
    slug: tenant.slug,
    businessName: tenant.business_name,
    readyForPilot: counts.critical === 0,
    readyForSalesDemo: counts.critical === 0 && counts.warning <= 8,
    counts,
    summary: {
      instances: tenantInstances.length,
      activeRooms: tenantRooms.length,
      pricingRows: tenantPricing.length,
      activeFaqs: tenantFaqs.length,
      roomsWithPhotos: tenantRooms.filter((room) => Array.isArray(room.photo_urls) && room.photo_urls.length > 0).length,
    },
    issues,
  };
}

function requireField(issues, severity, value, message) {
  if (!value) issues.push({ severity, message });
}

function renderMarkdown(items) {
  const lines = ['# Supabase Tenant Onboarding Readiness Report', '', `Generated: ${new Date().toISOString()}`, ''];
  for (const item of items) {
    lines.push(`## ${item.businessName || item.slug || item.tenantId}`);
    lines.push(`- Tenant ID: ${item.tenantId}`);
    lines.push(`- Pilot ready: ${item.readyForPilot ? 'YES' : 'NO'}`);
    lines.push(`- Sales demo ready: ${item.readyForSalesDemo ? 'YES' : 'NO'}`);
    lines.push(`- Critical issues: ${item.counts.critical}`);
    lines.push(`- Warnings: ${item.counts.warning}`);
    lines.push(`- Instances: ${item.summary.instances}`);
    lines.push(`- Active rooms: ${item.summary.activeRooms}`);
    lines.push(`- Pricing rows: ${item.summary.pricingRows}`);
    lines.push(`- Rooms with photos: ${item.summary.roomsWithPhotos}/${item.summary.activeRooms}`);
    lines.push(`- Active FAQs/policies: ${item.summary.activeFaqs}`);
    lines.push('- Issues:');
    if (!item.issues.length) {
      lines.push('  - OK No issues found.');
    } else {
      for (const issue of item.issues) lines.push(`  - ${issue.severity.toUpperCase()}: ${issue.message}`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
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
