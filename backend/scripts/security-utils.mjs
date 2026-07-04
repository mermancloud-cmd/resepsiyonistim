import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export const SECRET_PATTERNS = [
  { name: 'jwt_like_token', pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g },
  { name: 'openai_api_key', pattern: /sk-[A-Za-z0-9_-]{20,}/g },
  { name: 'bearer_token', pattern: /Bearer\s+[A-Za-z0-9._-]{20,}/gi },
  { name: 'evolution_api_key', pattern: /[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}/gi },
];

export const DEFAULT_IGNORES = [
  '.git',
  'node_modules',
  '.env',
  'data/backups',
  'data/exports',
  'data/proposed',
  'data/sanitized',
  'reports',
];

export function walkFiles(root, ignores = DEFAULT_IGNORES) {
  const out = [];
  const rootAbs = path.resolve(root);
  const ignoreAbs = ignores.map((item) => path.resolve(rootAbs, item));

  function walk(current) {
    const currentAbs = path.resolve(current);
    if (ignoreAbs.some((ignore) => currentAbs === ignore || currentAbs.startsWith(`${ignore}${path.sep}`))) return;
    const stat = statSync(currentAbs);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(currentAbs)) walk(path.join(currentAbs, entry));
      return;
    }
    if (stat.isFile()) out.push(currentAbs);
  }

  walk(rootAbs);
  return out;
}

export function scanText(text) {
  const findings = [];
  for (const { name, pattern } of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      findings.push({
        name,
        index: match.index || 0,
        sample: maskSecret(match[0]),
      });
    }
  }
  return findings;
}

export function scanFile(file) {
  if (!existsSync(file)) return [];
  const text = readFileSync(file, 'utf8');
  return scanText(text);
}

export function maskSecret(value) {
  const text = String(value || '');
  if (text.length <= 12) return '***';
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

export function sanitizeText(text) {
  let output = text;
  for (const { pattern } of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    output = output.replace(pattern, (value) => `__REDACTED_${value.slice(0, 3).toUpperCase()}__`);
  }
  return output;
}
