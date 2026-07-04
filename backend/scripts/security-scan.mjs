import path from 'node:path';
import { scanFile, walkFiles } from './security-utils.mjs';

const root = process.cwd();
const includeIgnored = process.argv.includes('--include-ignored');
const files = includeIgnored ? walkFiles(root, ['.git', 'node_modules']) : walkFiles(root);
const findings = [];

for (const file of files) {
  if (/\.(png|jpg|jpeg|gif|webp|ico|pdf|zip)$/i.test(file)) continue;
  for (const finding of scanFile(file)) {
    findings.push({
      file: path.relative(root, file).replace(/\\/g, '/'),
      ...finding,
    });
  }
}

if (findings.length) {
  console.error('Secret scan failed:');
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.name} ${finding.sample}`);
  }
  process.exit(1);
}

console.log(`Secret scan OK (${files.length} files checked).`);
