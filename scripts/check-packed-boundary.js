#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'create-kdna-web-app-pack-'));

function pack() {
  const report = JSON.parse(execFileSync(
    'npm',
    ['pack', '--json', '--ignore-scripts', '--pack-destination', temp],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        npm_config_dry_run: 'false',
      },
    },
  ))[0];
  assert.ok(report?.filename, 'npm pack did not report one archive');
  return path.join(temp, report.filename);
}

try {
  const first = pack();
  const firstBytes = fs.readFileSync(first);
  fs.renameSync(first, `${first}.first`);
  const second = pack();
  assert.ok(firstBytes.equals(fs.readFileSync(second)), 'consecutive npm packs must be byte-for-byte deterministic');

  const entries = execFileSync('tar', ['-tzf', second], { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean);
  for (const required of [
    'package/bin/create-kdna-web-app.js',
    'package/src/scaffold.js',
    'package/templates/express/public/index.html',
    'package/templates/nextjs/app/page.jsx',
    'package/templates/nextjs-pages/pages/index.jsx',
    'package/templates/express/README.md',
    'package/templates/express/pnpm-workspace.yaml',
    'package/templates/nextjs/README.md',
    'package/templates/nextjs/pnpm-workspace.yaml',
    'package/templates/nextjs-pages/README.md',
    'package/templates/nextjs-pages/pnpm-workspace.yaml',
    'package/README.md',
    'package/SECURITY.md',
    'package/LICENSE',
  ]) assert.ok(entries.includes(required), `packed CLI is missing ${required}`);
  assert.ok(entries.every((entry) => !/^package\/(?:tests|scripts|\.github)\//u.test(entry)), 'packed CLI leaked development-only files');

  execFileSync('tar', ['-xzf', second, '-C', temp]);
  const packedRoot = path.join(temp, 'package');
  const pkg = JSON.parse(fs.readFileSync(path.join(packedRoot, 'package.json'), 'utf8'));
  assert.equal(pkg.version, '0.4.0');
  assert.equal(pkg.engines?.node, '>=20');
  assert.deepEqual(pkg.bin, { 'create-kdna-web-app': 'bin/create-kdna-web-app.js' });
  const license = fs.readFileSync(path.join(packedRoot, 'LICENSE'), 'utf8');
  assert.match(license, /END OF TERMS AND CONDITIONS/u);
  assert.equal(Buffer.byteLength(license), 11_355, 'packed LICENSE must contain the canonical Apache-2.0 text');
  assert.equal(
    crypto.createHash('sha256').update(license).digest('hex'),
    '699a9bdd9d3fb95f2146586a5fb1d7a6a6197a43422914f86869fed84c34222c',
    'packed LICENSE must be byte-identical to the canonical KDNA Apache-2.0 text',
  );
  for (const template of ['express', 'nextjs-pages', 'nextjs']) {
    const templatePkg = JSON.parse(fs.readFileSync(path.join(packedRoot, 'templates', template, 'package.json'), 'utf8'));
    assert.equal(templatePkg.engines?.node, '>=20');
    assert.equal(templatePkg.dependencies['@aikdna/kdna-core'], '0.20.0');
    assert.equal(templatePkg.dependencies['@aikdna/kdna-web-server'], '0.3.0');
    if (template.startsWith('nextjs')) {
      assert.equal(templatePkg.dependencies['@aikdna/kdna-react'], '0.3.0');
    }
  }
  const help = execFileSync(process.execPath, [path.join(packedRoot, 'bin/create-kdna-web-app.js'), '--help'], {
    encoding: 'utf8',
  });
  assert.match(help, /Usage: create-kdna-web-app/u);
  const sha256 = crypto.createHash('sha256').update(firstBytes).digest('hex');
  console.log(`Packed CLI boundary, exact template coordinates, and deterministic archive passed: sha256=${sha256}`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
