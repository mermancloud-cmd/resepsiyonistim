import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
loadDotEnv();

const baseUrl = normalizeBaseUrl(process.env.N8N_BASE_URL || '');
const webhookUrl = `${baseUrl.replace(/\/api\/v\d+$/i, '')}/webhook/whatsapp-inbound`;
const instance = process.env.N8N_TEST_INSTANCE || 'mnv';
const supabase = readSupabaseConfig();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const phone = `905${randomInt(100_000_000, 999_999_999)}`;
const report = [];

await postWebhook(phone, 'Yetkili olarak ben ilgileniyorum.', true, 'OWNER-TAKEOVER');
const takeover = await waitForConversation(phone, (conv) => conv.status === 'human_active');
report.push({
  step: 'owner_takeover',
  ok: takeover?.status === 'human_active' && takeover?.metadata?.owner_takeover === true,
  conversation: takeover,
});

await postWebhook(phone, 'Merhaba fiyat alabilir miyim?', false, 'GUEST-SUPPRESSED');
const suppressed = await waitForNoNewBotReply(takeover.id, takeover.metadata.owner_last_message_at);
report.push({
  step: 'guest_before_timeout_suppressed',
  ok: suppressed.ok,
  details: suppressed,
});

await patchConversation(takeover.id, {
  status: 'human_active',
  current_state: 'HUMAN_HANDOFF',
  metadata: {
    ...(takeover.metadata || {}),
    owner_takeover: true,
    bot_resume_after: new Date(Date.now() - 60_000).toISOString(),
  },
});

await postWebhook(phone, 'Hala müsaitlik var mı?', false, 'GUEST-RESUME');
const resumed = await waitForAssistantAfter(takeover.id, new Date(Date.now() - 5_000).toISOString());
const convAfterResume = await getConversation(phone);
report.push({
  step: 'guest_after_timeout_resumes',
  ok: !!resumed?.content && convAfterResume?.status === 'active',
  assistant: resumed?.content || null,
  conversation: convAfterResume,
});

await mkdir(path.join(root, 'reports'), { recursive: true });
const jsonPath = path.join(root, 'reports', `owner-takeover-${stamp}.json`);
const mdPath = path.join(root, 'reports', `owner-takeover-${stamp}.md`);
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(mdPath, renderMarkdown(report), 'utf8');

console.log(`Owner takeover report: ${path.relative(root, mdPath).replace(/\\/g, '/')}`);
for (const item of report) {
  console.log(`${item.ok ? 'OK' : 'FAIL'} ${item.step}`);
}
if (report.some((item) => !item.ok)) process.exitCode = 1;

async function postWebhook(targetPhone, text, fromMe, idPrefix) {
  const payload = {
    test_mode: true,
    event: 'messages.upsert',
    instance,
    data: {
      key: {
        remoteJid: `${targetPhone}@s.whatsapp.net`,
        fromMe,
        id: `${idPrefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      },
      pushName: fromMe ? undefined : 'Owner Test',
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

async function waitForConversation(targetPhone, predicate) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await sleep(1500);
    const conv = await getConversation(targetPhone);
    if (conv && (!predicate || predicate(conv))) return conv;
  }
  return null;
}

async function waitForNoNewBotReply(conversationId, afterIso) {
  await sleep(9000);
  const messages = await supabaseGet(`/messages?conversation_id=eq.${conversationId}&role=eq.assistant&sent_at=gt.${encodeURIComponent(afterIso)}&select=content,sent_at&order=sent_at.desc`);
  const botReplies = messages.filter((message) => !String(message.content || '').startsWith('Yetkili:'));
  return { ok: botReplies.length === 0, botReplies };
}

async function waitForAssistantAfter(conversationId, afterIso) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    await sleep(2500);
    const messages = await supabaseGet(`/messages?conversation_id=eq.${conversationId}&role=eq.assistant&sent_at=gt.${encodeURIComponent(afterIso)}&select=content,sent_at&order=sent_at.desc&limit=5`);
    const botReply = messages.find((message) => !String(message.content || '').startsWith('Yetkili:'));
    if (botReply) return botReply;
  }
  return null;
}

async function getConversation(targetPhone) {
  const rows = await supabaseGet(`/conversations?guest_phone=eq.${targetPhone}&select=id,status,current_state,metadata&limit=1`);
  return rows[0] || null;
}

async function patchConversation(conversationId, body) {
  const response = await fetch(`${supabase.url}/rest/v1/conversations?id=eq.${conversationId}`, {
    method: 'PATCH',
    headers: {
      apikey: supabase.key,
      authorization: `Bearer ${supabase.key}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Supabase PATCH failed ${response.status}: ${await response.text()}`);
  return response.json();
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

function renderMarkdown(items) {
  const lines = ['# Owner Takeover Simulation Report', '', `Generated: ${new Date().toISOString()}`, `Phone: ${phone}`, ''];
  for (const item of items) {
    lines.push(`## ${item.step}`);
    lines.push(`- Result: ${item.ok ? 'OK' : 'FAIL'}`);
    if (item.assistant) lines.push(`- Assistant: ${item.assistant}`);
    if (item.details) lines.push(`- Details: ${JSON.stringify(item.details)}`);
    if (item.conversation) lines.push(`- Conversation: ${JSON.stringify(item.conversation)}`);
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
