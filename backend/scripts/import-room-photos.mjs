import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
loadDotEnv();

const csvPath = path.resolve(root, process.argv[2] || 'data/room-photo-import-template.csv');
if (!existsSync(csvPath)) throw new Error(`CSV not found: ${csvPath}`);

const rows = parseCsv(readFileSync(csvPath, 'utf8')).filter((row) => row.room_name && row.photo_url);
if (!rows.length) throw new Error('No room photo rows found.');
if (rows.some((row) => /example\.com/i.test(row.photo_url))) {
  throw new Error('Template still contains example.com URLs. Replace with real room photo URLs before import.');
}

const supabase = readSupabaseConfig();
const grouped = new Map();
for (const row of rows) {
  const urls = grouped.get(row.room_name) || [];
  urls.push(row.photo_url);
  grouped.set(row.room_name, urls);
}

for (const [roomName, urls] of grouped) {
  const response = await fetch(`${supabase.url}/rest/v1/rooms?name=eq.${encodeURIComponent(roomName)}`, {
    method: 'PATCH',
    headers: {
      apikey: supabase.key,
      authorization: `Bearer ${supabase.key}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
    },
    body: JSON.stringify({ photo_urls: urls }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Failed to update ${roomName}: ${response.status} ${body}`);
  console.log(`Updated ${roomName}: ${urls.length} photo URL(s)`);
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headers = lines.shift()?.split(',').map((item) => item.trim()) || [];
  return lines.map((line) => {
    const values = line.split(',').map((item) => item.trim());
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
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
