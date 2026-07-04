import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
loadDotEnv();

const supabase = readSupabaseConfig();
const checks = [];

const rooms = await supabaseGet('/rooms?select=id,name,photo_urls,is_active&is_active=eq.true&order=sort_order.asc');
const faqs = await supabaseGet('/faqs?select=id,question,answer,category,priority,is_active&is_active=eq.true&order=priority.desc');
const settings = await supabaseGet('/tenant_settings?select=check_in_time,check_out_time,min_stay_nights,deposit_percentage,cancellation_policy,business_hours_start,business_hours_end&limit=1');

checks.push({
  name: 'active_rooms_have_photo_urls',
  ok: rooms.every((room) => Array.isArray(room.photo_urls) && room.photo_urls.filter(Boolean).length > 0),
  detail: `${rooms.filter((room) => !Array.isArray(room.photo_urls) || room.photo_urls.filter(Boolean).length === 0).length}/${rooms.length} active rooms missing photos`,
});

checks.push({
  name: 'active_faq_minimum_count',
  ok: faqs.length >= 10,
  detail: `${faqs.length} active FAQs`,
});

checks.push({
  name: 'policy_settings_present',
  ok: Boolean(settings[0]?.check_in_time && settings[0]?.check_out_time && settings[0]?.min_stay_nights && settings[0]?.deposit_percentage),
  detail: JSON.stringify(settings[0] || {}),
});

checks.push({
  name: 'cancellation_policy_present',
  ok: Boolean(settings[0]?.cancellation_policy),
  detail: settings[0]?.cancellation_policy ? 'configured' : 'missing, assistant must defer to team',
});

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? 'OK' : 'WARN'} ${check.name}: ${check.detail}`);
}

if (failed.some((check) => check.name !== 'active_rooms_have_photo_urls' && check.name !== 'cancellation_policy_present')) {
  process.exitCode = 1;
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
  if (!url.origin || !key) throw new Error('Could not read Supabase URL/key.');
  console.warn('Warning: reading Supabase key from workflow export. Prefer SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.');
  return { url: url.origin, key };
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
