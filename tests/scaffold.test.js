'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseArgs, scaffold } = require('../src/scaffold');

test('parseArgs handles template, package manager, and no-install flags', () => {
  assert.deepEqual(parseArgs(['demo', '--template', 'express', '--package-manager=pnpm', '--no-install']), {
    projectName: 'demo',
    template: 'express',
    packageManager: 'pnpm',
    install: false,
  });
});

test('scaffold creates a Next.js app router project without installing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'create-kdna-web-app-'));
  const project = path.join(tmp, 'demo-next');
  const result = scaffold({ projectName: project, template: 'nextjs', packageManager: 'npm', install: false });

  assert.equal(result.projectName, 'demo-next');
  assert.ok(fs.existsSync(path.join(project, 'app/api/kdna/[...route]/route.js')));
  assert.ok(fs.existsSync(path.join(project, 'app/page.jsx')));
  assert.ok(fs.existsSync(path.join(project, '.env.local.example')));
  assert.ok(fs.existsSync(path.join(project, 'scripts/smoke.mjs')));
  assert.doesNotMatch(fs.readFileSync(path.join(project, 'app/api/kdna/[...route]/route.js'), 'utf8'), /remoteServerUrl|KDNA_REMOTE/);
  assert.doesNotMatch(fs.readFileSync(path.join(project, '.env.local.example'), 'utf8'), /KDNA_REMOTE/);
  const pkg = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'demo-next');
  assert.equal(pkg.scripts.test, 'node scripts/smoke.mjs');
});

test('scaffold creates an Express project without installing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'create-kdna-web-app-'));
  const project = path.join(tmp, 'demo-express');
  scaffold({ projectName: project, template: 'express', packageManager: 'npm', install: false });

  assert.ok(fs.existsSync(path.join(project, 'src/server.js')));
  assert.ok(fs.existsSync(path.join(project, 'public/index.html')));
  assert.ok(fs.existsSync(path.join(project, '.env.example')));
  assert.ok(fs.existsSync(path.join(project, 'scripts/smoke.mjs')));
  assert.doesNotMatch(fs.readFileSync(path.join(project, 'src/server.js'), 'utf8'), /remoteServerUrl|KDNA_REMOTE/);
  assert.doesNotMatch(fs.readFileSync(path.join(project, '.env.example'), 'utf8'), /KDNA_REMOTE/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8')).scripts.test, 'node scripts/smoke.mjs');
});

test('scaffold creates a Next.js Pages project with a smoke test', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'create-kdna-web-app-'));
  const project = path.join(tmp, 'demo-pages');
  scaffold({ projectName: project, template: 'nextjs-pages', packageManager: 'npm', install: false });

  assert.ok(fs.existsSync(path.join(project, 'pages/api/kdna/[...route].js')));
  assert.ok(fs.existsSync(path.join(project, 'pages/index.jsx')));
  assert.ok(fs.existsSync(path.join(project, '.env.local.example')));
  assert.ok(fs.existsSync(path.join(project, 'scripts/smoke.mjs')));
  assert.doesNotMatch(fs.readFileSync(path.join(project, 'pages/api/kdna/[...route].js'), 'utf8'), /remoteServerUrl|KDNA_REMOTE/);
  assert.doesNotMatch(fs.readFileSync(path.join(project, '.env.local.example'), 'utf8'), /KDNA_REMOTE/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8')).scripts.test, 'node scripts/smoke.mjs');
});

test('scaffold rejects non-empty target directories', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'create-kdna-web-app-'));
  fs.writeFileSync(path.join(tmp, 'existing.txt'), 'x');
  assert.throws(
    () => scaffold({ projectName: tmp, template: 'nextjs', packageManager: 'npm', install: false }),
    /not empty/,
  );
});
