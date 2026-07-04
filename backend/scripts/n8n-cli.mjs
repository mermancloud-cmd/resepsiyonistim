import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const now = () => new Date().toISOString().replace(/[:.]/g, '-');

loadDotEnv();

const config = {
  baseUrl: normalizeBaseUrl(process.env.N8N_BASE_URL || ''),
  apiKey: process.env.N8N_API_KEY || '',
  selectionMode: (process.env.N8N_SELECTION_MODE || 'tag').toLowerCase(),
  tag: process.env.N8N_TAG || '',
  project: process.env.N8N_PROJECT || '',
  workflowIds: csv(process.env.N8N_WORKFLOW_IDS || ''),
  executionLimit: Number(process.env.N8N_EXECUTION_LIMIT || 50),
  autoDeploy: /^true$/i.test(process.env.N8N_AUTO_DEPLOY || ''),
};

const command = process.argv[2] || 'help';
const args = parseArgs(process.argv.slice(3));

try {
  if (command === 'help') help();
  else if (command === 'check') await check();
  else if (command === 'discover') await discover();
  else if (command === 'export') await exportWorkflows();
  else if (command === 'analyze') await analyze();
  else if (command === 'propose') await propose();
  else if (command === 'deploy') await deploy();
  else if (command === 'rollback') await rollback();
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(`\nERROR: ${error.message}`);
  process.exitCode = 1;
}

function help() {
  console.log(`Usage: npm.cmd run workflow -- <command>

Commands:
  check       Test n8n API connectivity
  discover    List workflow ids, names, tags, and projects
  export      Export selected workflows and write backups
  analyze     Analyze exported workflows and recent executions
  propose     Write low-risk workflow proposals to data/proposed
  deploy      Deploy JSON files from data/proposed
  rollback    Restore JSON files from --backup <dir>
`);
}

async function propose() {
  const exportDir = args.dir ? path.resolve(root, args.dir) : path.join(root, 'data', 'exports', 'latest');
  if (!existsSync(exportDir)) throw new Error(`Export directory not found: ${exportDir}`);

  const proposedDir = path.join(root, 'data', 'proposed');
  const files = (await readdir(exportDir)).filter((file) => file.endsWith('.json') && file !== 'manifest.json');
  if (!files.length) throw new Error(`No workflow JSON files found in ${exportDir}`);

  await mkdir(proposedDir, { recursive: true });
  const summary = [];

  for (const file of files) {
    const workflow = JSON.parse(await readFile(path.join(exportDir, file), 'utf8'));
    const changes = addSafeReadRetries(workflow);
    await writeJson(path.join(proposedDir, file), workflow);
    summary.push({
      id: workflow.id,
      name: workflow.name,
      file,
      changedNodes: changes,
    });
  }

  await mkdir(path.join(root, 'reports'), { recursive: true });
  await writeJson(path.join(root, 'reports', 'proposal-summary.json'), summary);
  console.log(`Wrote ${files.length} proposed workflow JSON file(s) to ${relative(proposedDir)}.`);
  for (const item of summary) {
    console.log(`- ${item.name}: ${item.changedNodes.length} low-risk retry change(s)`);
    for (const nodeName of item.changedNodes) console.log(`  - ${nodeName}`);
  }
}

async function discover() {
  requireApiConfig();
  const summaries = await listWorkflows();
  const workflows = [];
  for (const summary of summaries) {
    workflows.push(await getWorkflow(summary.id));
  }

  const rows = workflows.map((workflow) => ({
    id: workflow.id,
    name: workflow.name,
    active: Boolean(workflow.active),
    tags: tagNames(workflow).join(', '),
    project: projectNames(workflow).join(', '),
  }));

  await mkdir(path.join(root, 'reports'), { recursive: true });
  await writeJson(path.join(root, 'reports', 'discover.json'), rows);
  console.table(rows);
  console.log('Discovery written to reports/discover.json');
}

async function check() {
  requireApiConfig();
  const workflows = await listWorkflows();
  console.log(`API OK. Workflows visible: ${workflows.length}.`);
  printSelectionHints(workflows);
  const selected = await selectWorkflows(workflows);
  console.log(`Selected: ${selected.length}.`);
  if (!selected.length) {
    console.log('No workflows matched the current selection settings.');
  } else {
    for (const workflow of selected) {
      console.log(`- ${workflow.id}: ${workflow.name}`);
    }
  }
}

function printSelectionHints(workflows) {
  const tags = new Set();
  const projects = new Set();
  for (const workflow of workflows) {
    for (const value of tagNames(workflow)) tags.add(value);
    for (const value of projectNames(workflow)) projects.add(value);
  }

  if (tags.size) console.log(`Available tags: ${[...tags].sort().join(', ')}`);
  if (projects.size) console.log(`Available projects: ${[...projects].sort().join(', ')}`);
}

function tagNames(workflow) {
  return (workflow.tags || workflow.tagIds || [])
    .map((tag) => (typeof tag === 'string' ? tag : tag.name || tag.id))
    .filter(Boolean)
    .map(String);
}

function projectNames(workflow) {
  return [
    workflow.project,
    workflow.projectId,
    workflow.projectName,
    workflow.homeProject?.name,
    workflow.homeProject?.id,
  ].filter(Boolean).map(String);
}

async function exportWorkflows() {
  requireApiConfig();
  const workflows = await selectWorkflows(await listWorkflows());
  if (!workflows.length) throw new Error('No workflows matched the selection.');

  const stamp = now();
  const latestDir = path.join(root, 'data', 'exports', 'latest');
  const backupDir = path.join(root, 'data', 'backups', stamp);
  await mkdir(latestDir, { recursive: true });
  await mkdir(backupDir, { recursive: true });

  const manifest = [];
  for (const summary of workflows) {
    const workflow = await getWorkflow(summary.id);
    const fileName = workflowFileName(workflow);
    await writeJson(path.join(latestDir, fileName), workflow);
    await writeJson(path.join(backupDir, fileName), workflow);
    manifest.push({
      id: workflow.id,
      name: workflow.name,
      active: workflow.active,
      file: fileName,
      exportedAt: new Date().toISOString(),
    });
  }

  await writeJson(path.join(latestDir, 'manifest.json'), manifest);
  await writeJson(path.join(backupDir, 'manifest.json'), manifest);
  console.log(`Exported ${manifest.length} workflow(s).`);
  console.log(`Latest: ${relative(latestDir)}`);
  console.log(`Backup: ${relative(backupDir)}`);
}

async function analyze() {
  const exportDir = args.dir ? path.resolve(root, args.dir) : path.join(root, 'data', 'exports', 'latest');
  if (!existsSync(exportDir)) throw new Error(`Export directory not found: ${exportDir}`);

  const files = (await readdir(exportDir)).filter((file) => file.endsWith('.json') && file !== 'manifest.json');
  if (!files.length) throw new Error(`No workflow JSON files found in ${exportDir}`);

  const report = [];
  for (const file of files) {
    const workflow = JSON.parse(await readFile(path.join(exportDir, file), 'utf8'));
    const executions = config.baseUrl && config.apiKey ? await safeExecutionMetrics(workflow.id) : null;
    report.push(analyzeWorkflow(workflow, executions));
  }

  await mkdir(path.join(root, 'reports'), { recursive: true });
  await writeJson(path.join(root, 'reports', 'analysis.json'), report);
  await writeFile(path.join(root, 'reports', 'analysis.md'), renderMarkdown(report), 'utf8');
  console.log(`Analyzed ${report.length} workflow(s).`);
  console.log('Report: reports/analysis.md');
}

async function deploy() {
  requireApiConfig();
  if (!config.autoDeploy) {
    throw new Error('N8N_AUTO_DEPLOY must be true before deploying to production.');
  }

  const proposedDir = path.join(root, 'data', 'proposed');
  if (!existsSync(proposedDir)) throw new Error('data/proposed does not exist. Add validated workflow JSON files first.');
  const files = (await readdir(proposedDir)).filter((file) => file.endsWith('.json') && file !== 'manifest.json');
  if (!files.length) throw new Error('No workflow JSON files found in data/proposed.');

  const stamp = now();
  const backupDir = path.join(root, 'data', 'backups', `pre-deploy-${stamp}`);
  await mkdir(backupDir, { recursive: true });

  for (const file of files) {
    const proposed = JSON.parse(await readFile(path.join(proposedDir, file), 'utf8'));
    if (!proposed.id) throw new Error(`${file} is missing workflow id.`);

    const current = await getWorkflow(proposed.id);
    await writeJson(path.join(backupDir, workflowFileName(current)), current);

    const payload = sanitizeWorkflowForUpdate(proposed);
    await api(`/workflows/${encodeURIComponent(proposed.id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (proposed.active) {
      await api(`/workflows/${encodeURIComponent(proposed.id)}/activate`, { method: 'POST' });
    }
    console.log(`Deployed ${proposed.id}: ${proposed.name}`);
  }

  console.log(`Pre-deploy backup: ${relative(backupDir)}`);
}

async function rollback() {
  requireApiConfig();
  const backupDir = args.backup ? path.resolve(root, args.backup) : '';
  if (!backupDir) throw new Error('Pass --backup data/backups/<timestamp>.');
  if (!existsSync(backupDir)) throw new Error(`Backup directory not found: ${backupDir}`);

  const files = (await readdir(backupDir)).filter((file) => file.endsWith('.json') && file !== 'manifest.json');
  if (!files.length) throw new Error('No workflow JSON files found in backup directory.');

  for (const file of files) {
    const workflow = JSON.parse(await readFile(path.join(backupDir, file), 'utf8'));
    const payload = sanitizeWorkflowForUpdate(workflow);
    await api(`/workflows/${encodeURIComponent(workflow.id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (workflow.active) {
      await api(`/workflows/${encodeURIComponent(workflow.id)}/activate`, { method: 'POST' });
    } else {
      await api(`/workflows/${encodeURIComponent(workflow.id)}/deactivate`, { method: 'POST' });
    }
    console.log(`Rolled back ${workflow.id}: ${workflow.name}`);
  }
}

async function listWorkflows() {
  return listAll('/workflows', { limit: 100 });
}

async function getWorkflow(id) {
  return api(`/workflows/${encodeURIComponent(id)}`);
}

async function listExecutions(workflowId) {
  return listAll('/executions', {
    workflowId: String(workflowId),
    limit: String(config.executionLimit),
  }, config.executionLimit);
}

async function listAll(endpoint, params = {}, maxItems = Infinity) {
  const items = [];
  let cursor = null;

  do {
    const search = new URLSearchParams(params);
    if (cursor) search.set('cursor', cursor);
    const response = await api(`${endpoint}?${search}`);
    items.push(...unwrapList(response));
    cursor = response?.nextCursor || response?.nextPageCursor || null;
  } while (cursor && items.length < maxItems);

  return items.slice(0, maxItems);
}

async function selectWorkflows(workflows) {
  if (config.selectionMode === 'ids') {
    const ids = new Set(config.workflowIds);
    return workflows.filter((workflow) => ids.has(String(workflow.id)));
  }

  if (config.selectionMode === 'tag') {
    if (!config.tag) throw new Error('N8N_TAG is required when N8N_SELECTION_MODE=tag.');
    return workflows.filter((workflow) => hasTag(workflow, config.tag));
  }

  if (config.selectionMode === 'project') {
    if (!config.project) throw new Error('N8N_PROJECT is required when N8N_SELECTION_MODE=project.');
    return workflows.filter((workflow) => matchesProject(workflow, config.project));
  }

  throw new Error(`Unsupported N8N_SELECTION_MODE: ${config.selectionMode}`);
}

function analyzeWorkflow(workflow, executions) {
  const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
  const connections = workflow.connections || {};
  const issues = [];
  const nodeTypes = nodes.reduce((acc, node) => {
    acc[node.type] = (acc[node.type] || 0) + 1;
    return acc;
  }, {});

  const httpNodes = nodes.filter((node) => /httpRequest/i.test(node.type));
  const codeNodes = nodes.filter((node) => /code|function/i.test(node.type));
  const loopNodes = nodes.filter((node) => /splitInBatches|loopOverItems/i.test(node.type));
  const waitNodes = nodes.filter((node) => /wait/i.test(node.type));
  const errorHandlers = nodes.filter((node) => /errorTrigger|stopAndError/i.test(node.type));

  if (httpNodes.length && !loopNodes.length) {
    issues.push('HTTP-heavy workflow may need batching, pagination, or rate-limit handling.');
  }
  if (httpNodes.length && !JSON.stringify(workflow).match(/retry|timeout|continueOnFail/i)) {
    issues.push('No obvious retry/timeout/continue-on-fail configuration found for external calls.');
  }
  if (codeNodes.length) {
    issues.push('Code/function nodes need review for item linking, memory use, and deterministic error handling.');
  }
  if (!errorHandlers.length) {
    issues.push('No explicit error workflow/stop-error pattern detected.');
  }
  if (Object.keys(connections).length < Math.max(1, nodes.length - 1)) {
    issues.push('Disconnected or sparsely connected nodes may indicate dead work or manual-only branches.');
  }
  if (waitNodes.length) {
    issues.push('Wait nodes can increase execution retention and should be checked for timeout/storage impact.');
  }

  return {
    id: workflow.id,
    name: workflow.name,
    active: Boolean(workflow.active),
    nodeCount: nodes.length,
    nodeTypes,
    executionMetrics: executions,
    issues,
    recommendation: issues.length
      ? 'Create a proposed JSON change after manually validating the flagged paths in local n8n.'
      : 'No high-signal static issue detected; use execution metrics for deeper tuning.',
  };
}

function addSafeReadRetries(workflow) {
  const changed = [];
  for (const node of workflow.nodes || []) {
    if (!String(node.type || '').includes('httpRequest')) continue;
    if (!isReadOnlyHttpNode(node)) continue;
    if (node.retryOnFail && node.maxTries && node.waitBetweenTries) continue;

    node.retryOnFail = true;
    node.maxTries = 3;
    node.waitBetweenTries = 1000;
    changed.push(node.name);
  }
  return changed;
}

function isReadOnlyHttpNode(node) {
  const parameters = node.parameters || {};
  const method = String(parameters.method || parameters.requestMethod || 'GET').toUpperCase();
  const name = String(node.name || '');
  if (method !== 'GET') return false;
  if (!/^(Load|Get|Fetch)\b/i.test(name)) return false;
  return true;
}

async function safeExecutionMetrics(workflowId) {
  try {
    const executions = await listExecutions(workflowId);
    const total = executions.length;
    const failed = executions.filter((execution) => /error|failed|crashed/i.test(String(execution.status || execution.finished))).length;
    const durations = executions
      .map((execution) => durationMs(execution))
      .filter((value) => Number.isFinite(value) && value >= 0);
    return {
      inspected: total,
      failed,
      failureRate: total ? Number((failed / total).toFixed(3)) : 0,
      avgDurationMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
      maxDurationMs: durations.length ? Math.max(...durations) : null,
    };
  } catch (error) {
    return { error: error.message };
  }
}

function renderMarkdown(report) {
  const lines = ['# n8n Analysis Report', '', `Generated: ${new Date().toISOString()}`, ''];
  for (const item of report) {
    lines.push(`## ${item.name} (${item.id})`);
    lines.push(`- Active: ${item.active}`);
    lines.push(`- Nodes: ${item.nodeCount}`);
    if (item.executionMetrics) {
      lines.push(`- Executions inspected: ${item.executionMetrics.inspected ?? 'n/a'}`);
      lines.push(`- Failure rate: ${item.executionMetrics.failureRate ?? 'n/a'}`);
      lines.push(`- Avg duration ms: ${item.executionMetrics.avgDurationMs ?? 'n/a'}`);
      lines.push(`- Max duration ms: ${item.executionMetrics.maxDurationMs ?? 'n/a'}`);
    }
    lines.push('- Issues:');
    if (item.issues.length) {
      for (const issue of item.issues) lines.push(`  - ${issue}`);
    } else {
      lines.push('  - None detected by static checks.');
    }
    lines.push(`- Recommendation: ${item.recommendation}`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

async function api(endpoint, init = {}) {
  requireApiConfig();
  const response = await fetch(`${config.baseUrl}${endpoint}`, {
    ...init,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'X-N8N-API-KEY': config.apiKey,
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.message || data?.error || text || response.statusText;
    throw new Error(`${response.status} ${response.statusText}: ${message}`);
  }
  return data;
}

function sanitizeWorkflowForUpdate(workflow) {
  const payload = {
    name: workflow.name,
    nodes: workflow.nodes || [],
    connections: workflow.connections || {},
    settings: sanitizeWorkflowSettings(workflow.settings || {}),
  };
  return payload;
}

function sanitizeWorkflowSettings(settings) {
  const allowed = [
    'executionOrder',
    'timezone',
    'saveManualExecutions',
    'saveDataErrorExecution',
    'saveDataSuccessExecution',
    'saveExecutionProgress',
    'executionTimeout',
    'errorWorkflow',
  ];
  return Object.fromEntries(
    allowed
      .filter((key) => settings[key] !== undefined)
      .map((key) => [key, settings[key]]),
  );
}

function unwrapList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

function hasTag(workflow, tagName) {
  const wanted = tagName.toLowerCase();
  const tags = workflow.tags || workflow.tagIds || [];
  return tags.some((tag) => {
    if (typeof tag === 'string') return tag.toLowerCase() === wanted;
    return String(tag.name || tag.id || '').toLowerCase() === wanted;
  });
}

function matchesProject(workflow, projectName) {
  const wanted = projectName.toLowerCase();
  const candidates = [
    workflow.project,
    workflow.projectId,
    workflow.projectName,
    workflow.homeProject?.name,
    workflow.homeProject?.id,
  ].filter(Boolean);
  return candidates.some((value) => String(value).toLowerCase() === wanted);
}

function durationMs(execution) {
  const start = execution.startedAt || execution.startTime;
  const stop = execution.stoppedAt || execution.finishedAt || execution.updatedAt;
  if (!start || !stop) return NaN;
  return new Date(stop).getTime() - new Date(start).getTime();
}

function workflowFileName(workflow) {
  return `${safeFilePart(workflow.name)}__${workflow.id}.json`;
}

function safeFilePart(value) {
  return String(value || 'workflow')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function requireApiConfig() {
  if (!config.baseUrl) throw new Error('N8N_BASE_URL is required.');
  if (!config.apiKey) throw new Error('N8N_API_KEY is required.');
}

function normalizeBaseUrl(value) {
  const trimmed = value.replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/\/api\/v\d+$/i.test(trimmed)) return trimmed;
  return `${trimmed}/api/v1`;
}

function csv(value) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function relative(filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value.startsWith('--')) {
      parsed[value.slice(2)] = values[index + 1] && !values[index + 1].startsWith('--') ? values[++index] : true;
    }
  }
  return parsed;
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
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}
