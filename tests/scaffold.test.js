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
  assert.ok(fs.existsSync(path.join(project, 'app/layout.jsx')));
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

test('template smoke scripts cover the generated KDNA server adapter imports', () => {
  const root = path.join(__dirname, '..');
  const cases = [
    {
      template: 'nextjs',
      route: 'app/api/kdna/[...route]/route.js',
      smoke: 'scripts/smoke.mjs',
      expectedImport: '@aikdna/kdna-web-server/nextjs',
      expectedExport: 'createNextHandlers',
    },
    {
      template: 'nextjs-pages',
      route: 'pages/api/kdna/[...route].js',
      smoke: 'scripts/smoke.mjs',
      expectedImport: '@aikdna/kdna-web-server/express',
      expectedExport: 'createKDNARouter',
    },
    {
      template: 'express',
      route: 'src/server.js',
      smoke: 'scripts/smoke.mjs',
      expectedImport: '@aikdna/kdna-web-server/express',
      expectedExport: 'createKDNARouter',
    },
  ];

  for (const entry of cases) {
    const templateDir = path.join(root, 'templates', entry.template);
    const routeSource = fs.readFileSync(path.join(templateDir, entry.route), 'utf8');
    const smokeSource = fs.readFileSync(path.join(templateDir, entry.smoke), 'utf8');

    assert.match(routeSource, new RegExp(entry.expectedImport.replaceAll('/', '\\/')));
    assert.match(routeSource, new RegExp(`\\b${entry.expectedExport}\\b`));
    assert.match(smokeSource, new RegExp(entry.expectedImport.replaceAll('/', '\\/')));
    assert.match(smokeSource, new RegExp(`\\b${entry.expectedExport}\\b`));
  }
});

test('template package dependencies use bounded version ranges', () => {
  const root = path.join(__dirname, '..');
  const expectedRanges = {
    '@aikdna/kdna-core': '^0.15.10',
    '@aikdna/kdna-react': '^0.1.0',
    '@aikdna/kdna-web-server': '^0.1.0',
  };

  for (const template of ['nextjs', 'nextjs-pages', 'express']) {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'templates', template, 'package.json'), 'utf8'));
    for (const [name, range] of Object.entries(pkg.dependencies || {})) {
      assert.notEqual(range, 'latest', `${template} should not use latest for ${name}`);
    }
    for (const [name, range] of Object.entries(expectedRanges)) {
      if (pkg.dependencies[name]) assert.equal(pkg.dependencies[name], range);
    }
  }
});

test('Next.js templates do not install unused browser-client package', () => {
  const root = path.join(__dirname, '..');

  for (const template of ['nextjs', 'nextjs-pages']) {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'templates', template, 'package.json'), 'utf8'));
    assert.equal(pkg.dependencies['@aikdna/kdna-web-client'], undefined);
  }
});

test('public package metadata only advertises implemented templates', () => {
  const root = path.join(__dirname, '..');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.match(pkg.description, /Next\.js App Router/);
  assert.match(pkg.description, /Next\.js Pages Router/);
  assert.match(pkg.description, /Express/);
  assert.doesNotMatch(pkg.description, /bare Node\.js/);
});

test('documentation pins example KDNA asset release URLs', () => {
  const root = path.join(__dirname, '..');
  for (const relPath of ['README.md', 'docs/getting-started.md']) {
    const text = fs.readFileSync(path.join(root, relPath), 'utf8');
    assert.doesNotMatch(text, /releases\/latest\/download\/[^\\s]+\\.kdna/);
    assert.match(
      text,
      /releases\/download\/agent-project-context-v0\.1\.2\/agent-project-context-v0\.1\.2\.kdna/,
    );
  }
});

test('npm package includes public docs and security policy', () => {
  const root = path.join(__dirname, '..');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  assert.ok(pkg.files.includes('docs/'));
  assert.ok(pkg.files.includes('SECURITY.md'));
  assert.ok(fs.existsSync(path.join(root, 'docs/template-checklist.md')));
});

test('scaffold rejects non-empty target directories', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'create-kdna-web-app-'));
  fs.writeFileSync(path.join(tmp, 'existing.txt'), 'x');
  assert.throws(
    () => scaffold({ projectName: tmp, template: 'nextjs', packageManager: 'npm', install: false }),
    /not empty/,
  );
});
