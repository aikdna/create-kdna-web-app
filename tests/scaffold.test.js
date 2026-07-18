'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
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

test('parseArgs rejects unknown options and missing option values', () => {
  assert.throws(() => parseArgs(['--unknown']), /Unknown option/u);
  assert.throws(() => parseArgs(['demo', '--template']), /requires a value/u);
  assert.throws(() => parseArgs(['demo', '--package-manager', '--no-install']), /requires a value/u);
});

test('scaffold creates a Next.js app router project without installing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'create-kdna-web-app-'));
  const project = path.join(tmp, 'demo-next');
  const result = scaffold({ projectName: project, template: 'nextjs', packageManager: 'npm', install: false });

  assert.equal(result.projectName, 'demo-next');
  assert.ok(fs.existsSync(path.join(project, 'app/layout.jsx')));
  assert.ok(fs.existsSync(path.join(project, 'app/api/kdna/[...route]/route.js')));
  assert.ok(fs.existsSync(path.join(project, 'app/page.jsx')));
  assert.ok(fs.existsSync(path.join(project, 'next.config.mjs')));
  assert.ok(fs.existsSync(path.join(project, '.env.local.example')));
  assert.ok(fs.existsSync(path.join(project, 'scripts/smoke.mjs')));
  assert.ok(fs.existsSync(path.join(project, 'README.md')));
  assert.doesNotMatch(fs.readFileSync(path.join(project, 'app/api/kdna/[...route]/route.js'), 'utf8'), /remoteServerUrl|KDNA_REMOTE/);
  assert.doesNotMatch(fs.readFileSync(path.join(project, '.env.local.example'), 'utf8'), /KDNA_REMOTE/);
  const pkg = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'demo-next');
  assert.equal(pkg.scripts.test, 'node scripts/smoke.mjs');
  assert.equal(pkg.engines.node, '>=20');
});

test('scaffold creates an Express project without installing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'create-kdna-web-app-'));
  const project = path.join(tmp, 'demo-express');
  scaffold({ projectName: project, template: 'express', packageManager: 'npm', install: false });

  assert.ok(fs.existsSync(path.join(project, 'src/server.js')));
  assert.ok(fs.existsSync(path.join(project, 'public/index.html')));
  assert.ok(fs.existsSync(path.join(project, '.env.example')));
  assert.ok(fs.existsSync(path.join(project, 'scripts/smoke.mjs')));
  assert.ok(fs.existsSync(path.join(project, 'README.md')));
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
  assert.ok(fs.existsSync(path.join(project, 'README.md')));
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

test('Pages Router normalizes its catch-all route for the Express adapter', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'templates/nextjs-pages/pages/api/kdna/[...route].js'),
    'utf8',
  );
  assert.match(source, /Array\.isArray\(req\.query\.route\)/u);
  assert.match(source, /req\.url = `\/\$\{route\.join\('\/'\)\}`/u);
  assert.match(source, /finally \{/u);
  assert.match(source, /req\.url = incomingUrl/u);
});

test('template package dependencies use bounded version ranges', () => {
  const root = path.join(__dirname, '..');
  const expectedRanges = {
    '@aikdna/kdna-core': '0.20.0',
    '@aikdna/kdna-react': '0.3.0',
    '@aikdna/kdna-web-server': '0.3.0',
  };

  for (const template of ['nextjs', 'nextjs-pages', 'express']) {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'templates', template, 'package.json'), 'utf8'));
    assert.equal(pkg.engines.node, '>=20');
    for (const [name, range] of Object.entries(pkg.dependencies || {})) {
      assert.notEqual(range, 'latest', `${template} should not use latest for ${name}`);
    }
    for (const [name, range] of Object.entries(expectedRanges)) {
      if (pkg.dependencies[name]) assert.equal(pkg.dependencies[name], range);
    }
  }
});

test('browser templates execute LoadPlan before load and render structured content safely', () => {
  const root = path.join(__dirname, '..');
  for (const sourcePath of [
    'templates/nextjs/app/page.jsx',
    'templates/nextjs-pages/pages/index.jsx',
  ]) {
    const source = fs.readFileSync(path.join(root, sourcePath), 'utf8');
    assert.match(source, /JSON\.stringify\(visibleContent, null, 2\)/u);
    assert.match(source, /visibleContent \? 'loaded' : status/u);
    assert.doesNotMatch(source, /\{(?:unlock|unlockedContent) \|\| content \|\| status\}/u);
  }
  const express = fs.readFileSync(path.join(root, 'templates/express/public/index.html'), 'utf8');
  const inspectIndex = express.indexOf("fetch('/api/kdna/inspect'");
  const planIndex = express.indexOf("fetch('/api/kdna/plan-load'");
  const loadIndex = express.indexOf("fetch('/api/kdna/load'");
  assert.ok(inspectIndex >= 0 && inspectIndex < planIndex && planIndex < loadIndex);
  assert.match(express, /JSON\.stringify\(\{ inspect, plan: plan\.plan, content: loaded\.content \}, null, 2\)/u);
  assert.match(express, /id="kdna-password" type="password"/u);
  assert.match(express, /passwordForm\.addEventListener\('submit'/u);
  assert.match(express, /passwordInput\.value = ''/u);
  assert.match(express, /password,/u);
  assert.doesNotMatch(express, /loaded\.content \|\|/u);
});

test('App Router keeps KDNA Core outside the Turbopack server bundle', () => {
  const config = fs.readFileSync(
    path.join(__dirname, '..', 'templates', 'nextjs', 'next.config.mjs'),
    'utf8',
  );
  assert.match(config, /serverExternalPackages/);
  assert.match(config, /@aikdna\/kdna-core/);
});

test('Next.js templates pin patched PostCSS for npm audit hygiene', () => {
  const root = path.join(__dirname, '..');

  for (const template of ['nextjs', 'nextjs-pages']) {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'templates', template, 'package.json'), 'utf8'));
    const pnpm = fs.readFileSync(path.join(root, 'templates', template, 'pnpm-workspace.yaml'), 'utf8');
    assert.equal(pkg.overrides.postcss, '8.5.10');
    assert.equal(pkg.resolutions.postcss, '8.5.10');
    assert.match(pnpm, /overrides:\n  postcss: 8\.5\.10/u);
    assert.match(pnpm, /allowBuilds:\n  cbor-extract: true\n  sharp: true/u);
  }
});

test('pnpm templates approve only the exact native builds they require', () => {
  const root = path.join(__dirname, '..', 'templates');
  const express = fs.readFileSync(path.join(root, 'express', 'pnpm-workspace.yaml'), 'utf8');
  assert.match(express, /allowBuilds:\n  cbor-extract: true/u);
  assert.doesNotMatch(express, /dangerouslyAllowAllBuilds/u);
  for (const template of ['express', 'nextjs', 'nextjs-pages']) {
    const source = fs.readFileSync(path.join(root, template, 'pnpm-workspace.yaml'), 'utf8');
    assert.match(source, /minimumReleaseAgeExclude:/u);
    assert.match(source, /@aikdna\/kdna-core@0\.20\.0/u);
    assert.doesNotMatch(source, /@aikdna\/\*/u);
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

test('publish workflow proves main ancestry and rejects an existing registry coordinate', () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, '..', '.github/workflows/publish.yml'),
    'utf8',
  );
  assert.match(workflow, /git fetch --no-tags origin main:refs\/remotes\/origin\/main/u);
  assert.match(workflow, /npm run release:context/u);
  assert.match(workflow, /already exists; refusing a duplicate or conflicting release/u);
  assert.match(workflow, /appeared during release verification; refusing to overwrite or skip/u);
  assert.match(workflow, /KDNA_TEST_ASSET: \$\{\{ github\.workspace \}\}/u);
  assert.match(workflow, /KDNA_TEST_PROTECTED_ASSET: \$\{\{ github\.workspace \}\}/u);
  assert.match(workflow, /1e77e3e0d486c330fe9f9262b514ef24c859d469/u);
  assert.ok(!workflow.includes(['already published', 'skipping'].join('; ')));
});

test('production template gate has no local package or single-template override', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'scripts/test-templates.js'),
    'utf8',
  );
  for (const token of [
    ['KDNA', 'REACT', 'PACKAGE'].join('_'),
    ['KDNA', 'TEST', 'TEMPLATE'].join('_'),
    ['KDNA', 'BROWSER', 'EXECUTABLE'].join('_'),
  ]) assert.ok(!source.includes(token));
  assert.doesNotMatch(source, /dependencies\['@aikdna\/kdna-react'\]\s*=/u);
  assert.match(source, /KDNA_TEST_PROTECTED_ASSET/u);
  assert.match(source, /c4486ceacc08d29af2ecdbe6c02818f78b62722592be687f7f0da23130bbe188/u);
});

test('CI proves the advertised pnpm and Yarn install paths', () => {
  const root = path.join(__dirname, '..');
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  const verifier = fs.readFileSync(path.join(root, 'scripts/test-package-manager.js'), 'utf8');
  assert.match(workflow, /pnpm-11\.14\.0/u);
  assert.match(workflow, /yarn-1\.22\.22/u);
  assert.match(workflow, /node scripts\/test-package-manager\.js/u);
  assert.match(verifier, /create-kdna-web-app/u);
  assert.match(verifier, /'--package-manager', manager/u);
  assert.match(verifier, /run\(manager, \['run', 'build'\]/u);
});

test('the source license is byte-identical to the canonical KDNA Apache text', () => {
  const license = fs.readFileSync(path.join(__dirname, '..', 'LICENSE'));
  assert.equal(license.length, 11_355);
  assert.equal(
    crypto.createHash('sha256').update(license).digest('hex'),
    '699a9bdd9d3fb95f2146586a5fb1d7a6a6197a43422914f86869fed84c34222c',
  );
});

test('documentation generates a current example KDNA asset locally', () => {
  const root = path.join(__dirname, '..');
  for (const relPath of ['README.md', 'docs/getting-started.md']) {
    const text = fs.readFileSync(path.join(root, relPath), 'utf8');
    assert.doesNotMatch(text, /releases\/download\/[^\\s]+\\.kdna/);
    assert.match(text, /kdna demo judgment/);
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
  const project = path.join(tmp, 'existing-project');
  fs.mkdirSync(project);
  fs.writeFileSync(path.join(project, 'existing.txt'), 'x');
  assert.throws(
    () => scaffold({ projectName: project, template: 'nextjs', packageManager: 'npm', install: false }),
    /not empty/,
  );
});

test('scaffold rejects project directory names that cannot be safe package names', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'create-kdna-web-app-'));
  assert.throws(
    () => scaffold({
      projectName: path.join(tmp, 'Invalid Name'),
      template: 'nextjs',
      packageManager: 'npm',
      install: false,
    }),
    /lowercase npm package name/u,
  );
});
