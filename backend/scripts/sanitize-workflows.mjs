import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { sanitizeText } from './security-utils.mjs';

const root = process.cwd();
const source = path.resolve(root, process.argv[2] || 'data/exports/latest');
const target = path.resolve(root, process.argv[3] || 'data/sanitized/latest');

if (!existsSync(source)) {
  throw new Error(`Source directory does not exist: ${source}`);
}

async function copySanitized(from, to) {
  const stat = statSync(from);
  if (stat.isDirectory()) {
    await mkdir(to, { recursive: true });
    for (const entry of readdirSync(from)) await copySanitized(path.join(from, entry), path.join(to, entry));
    return;
  }
  if (!stat.isFile()) return;
  await mkdir(path.dirname(to), { recursive: true });
  const text = await readFile(from, 'utf8');
  await writeFile(to, sanitizeText(text), 'utf8');
}

await copySanitized(source, target);
console.log(`Sanitized copy written to ${path.relative(root, target).replace(/\\/g, '/')}`);
