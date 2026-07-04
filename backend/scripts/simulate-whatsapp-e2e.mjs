import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
loadDotEnv();

if (process.env.REAL_WHATSAPP_TEST !== 'true') {
  console.log('Skipped real WhatsApp E2E test. Set REAL_WHATSAPP_TEST=true and WHATSAPP_TEST_PHONE=905... to send a real message.');
  process.exit(0);
}

const phone = process.env.WHATSAPP_TEST_PHONE;
const instance = process.env.N8N_TEST_INSTANCE || process.env.EVOLUTION_INSTANCE || 'mnv';
const apiUrl = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
const apiKey = process.env.EVOLUTION_API_KEY || '';
const text = process.env.WHATSAPP_TEST_TEXT || `Codex E2E test ${new Date().toISOString()}: Merhaba, bilgi almak istiyorum`;

if (!/^90\d{10}$/.test(phone || '')) throw new Error('WHATSAPP_TEST_PHONE must be a Turkish number like 905xxxxxxxxx.');
if (!apiUrl || !apiKey) throw new Error('EVOLUTION_API_URL and EVOLUTION_API_KEY are required for real WhatsApp E2E.');

const response = await fetch(`${apiUrl}/message/sendText/${instance}`, {
  method: 'POST',
  headers: {
    apikey: apiKey,
    'content-type': 'application/json',
  },
  body: JSON.stringify({ number: phone, text }),
});

const body = await response.text();
if (!response.ok) throw new Error(`Evolution send failed ${response.status}: ${body}`);

console.log(JSON.stringify({
  sent: true,
  instance,
  phone,
  text_length: text.length,
  response: safeJson(body),
}, null, 2));

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch (_) {
    return value.slice(0, 500);
  }
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
