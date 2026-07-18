#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const allowlistPath = 'scripts/naming-integrity-allowlist.json';
const allowlist = JSON.parse(fs.readFileSync(path.join(root, allowlistPath), 'utf8'));
if (allowlist.schema !== 'kdna.naming-integrity-third-party-allowlist'
    || allowlist.schema_version !== '0.1.0'
    || !Array.isArray(allowlist.exceptions)) {
  throw new Error('Third-party naming allowlist is invalid.');
}

const allowed = new Map();
for (const entry of allowlist.exceptions) {
  if (!entry.reason.includes('Third-party') || !Number.isInteger(entry.count) || entry.count < 1) {
    throw new Error(`Invalid third-party naming exception for ${entry.path || '(missing path)'}.`);
  }
  allowed.set(`${entry.path}\0${entry.token}`, entry.count);
}

const extensions = new Set([
  '.cjs', '.css', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.txt', '.yaml', '.yml',
]);
const files = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { cwd: root },
).toString('utf8').split('\0').filter(Boolean);
const findings = [];

for (const relative of files) {
  if (relative === allowlistPath || !extensions.has(path.extname(relative))) continue;
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) continue;
  let text = fs.readFileSync(absolute, 'utf8').replace(
    /("integrity"\s*:\s*")[^"]+(")/gu,
    '$1<opaque third-party digest>$2',
  );
  for (const [key, count] of allowed) {
    const [allowedPath, token] = key.split('\0');
    if (relative !== allowedPath) continue;
    const observed = text.split(token).length - 1;
    if (observed !== count) findings.push(`${relative}: allowlisted token count ${observed}, expected ${count}`);
    text = text.split(token).join('');
  }
  if (/(?:^|[^A-Za-z0-9])v\d+(?:\.\d+)*(?=$|[^A-Za-z0-9])/giu.test(text)) {
    findings.push(`${relative}: generation-style label`);
  }
}

for (const [key] of allowed) {
  const [allowedPath] = key.split('\0');
  if (!files.includes(allowedPath)) findings.push(`${allowedPath}: stale third-party exception path`);
}
if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}
console.log('Naming integrity check passed.');
