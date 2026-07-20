#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const textExtensions = new Set([
  '.cjs', '.css', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.txt', '.yaml', '.yml',
]);
const findings = [];
const forbiddenText = [
  ['private', 'x-plan'].join('/'),
  ['provider', 'error body'].join(' '),
  ['credential', 'path'].join(' '),
  ['credential', 'prefix'].join(' '),
  ['credential', 'length'].join(' '),
];
const files = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { cwd: root },
).toString('utf8').split('\0').filter(Boolean);

for (const relative of files) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) continue;
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) {
    findings.push(`${relative}: repository contains a symlink`);
    continue;
  }
  if (!stat.isFile() || (!textExtensions.has(path.extname(relative)) && relative !== 'NOTICE')) continue;
  const bytes = fs.readFileSync(absolute);
  if (bytes.length > 1_000_000 || bytes.includes(0)) continue;
  const text = bytes.toString('utf8');
  if (/\/Users\/(?!<user>\/|you\/|username\/)[^/\s]+\//u.test(text)) {
    findings.push(`${relative}: machine-specific filesystem path`);
  }
  if (/(?:^|\/)(?:AGENTS|WORKLOG)\.md$/iu.test(relative)) {
    findings.push(`${relative}: private coordination file`);
  }
  if (forbiddenText.some((token) => text.toLowerCase().includes(token))) {
    findings.push(`${relative}: private coordination or credential detail`);
  }
}

if (findings.length > 0) {
  for (const finding of findings) console.error(finding);
  throw new Error(`public-surface check found ${findings.length} issue(s)`);
}
const license = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8');
for (const required of [
  'Apache License',
  'Version 2.0, January 2004',
  'TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION',
  '1. Definitions.',
  '9. Accepting Warranty or Additional Liability.',
  'END OF TERMS AND CONDITIONS',
]) {
  if (!license.includes(required)) throw new Error(`LICENSE is missing: ${required}`);
}
if (Buffer.byteLength(license) < 11_000) {
  throw new Error('LICENSE must contain the complete Apache-2.0 text.');
}
if (crypto.createHash('sha256').update(license).digest('hex') !== '699a9bdd9d3fb95f2146586a5fb1d7a6a6197a43422914f86869fed84c34222c') {
  throw new Error('LICENSE must be byte-identical to the canonical KDNA Apache-2.0 text.');
}
const dcoWorkflow = fs.readFileSync(path.join(root, '.github/workflows/dco.yml'), 'utf8');
const ciWorkflow = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
const publishWorkflowPath = path.join(root, '.github/workflows/publish.yml');
if (!dcoWorkflow.includes('node scripts/check-dco.cjs')) throw new Error('DCO workflow must run the repository verifier.');
if (fs.existsSync(publishWorkflowPath)) throw new Error('frozen repository must not contain a publish workflow.');
for (const workflow of [ciWorkflow]) {
  if (!workflow.includes('1e77e3e0d486c330fe9f9262b514ef24c859d469')) {
    throw new Error('production workflows must pin the exact protected Core fixture commit.');
  }
  if (!workflow.includes('KDNA_TEST_PROTECTED_ASSET')) {
    throw new Error('production workflows must execute the protected asset adoption gate.');
  }
}
console.log('Public-surface check passed.');
