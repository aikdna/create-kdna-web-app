#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const { chromium } = require('playwright');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;
const repositoryRoot = path.resolve(__dirname, '..');
const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'create-kdna-web-app-production-'));
const expectedKDNA = Object.freeze({
  '@aikdna/kdna-core': '0.20.0',
  '@aikdna/kdna-react': '0.3.0',
  '@aikdna/kdna-web-server': '0.3.0',
});
const protectedAssetSha256 = 'c4486ceacc08d29af2ecdbe6c02818f78b62722592be687f7f0da23130bbe188';
const protectedTestVectorPassword = 'KDNA-TEST-VECTOR-2026';

function assertRegistryLock(projectDir, template) {
  const lock = JSON.parse(fs.readFileSync(path.join(projectDir, 'package-lock.json'), 'utf8'));
  const expected = {
    '@aikdna/kdna-core': '0.20.0',
    '@aikdna/kdna-web-server': '0.3.0',
    ...(template.startsWith('nextjs')
      ? {
          '@aikdna/kdna-react': '0.3.0',
          '@aikdna/kdna-web-client': '0.2.2',
        }
      : {}),
  };
  for (const [name, version] of Object.entries(expected)) {
    const entry = lock.packages?.[`node_modules/${name}`];
    assert.equal(entry?.version, version, `${template} lock must resolve ${name}@${version}`);
    assert.match(
      entry?.resolved || '',
      /^https:\/\/registry\.npmjs\.org\//u,
      `${template} lock must resolve ${name} from the npm registry`,
    );
    assert.notEqual(entry?.link, true, `${template} lock cannot link ${name} from a local package`);
  }
  console.log(JSON.stringify({
    schema: 'kdna.scaffolder-registry-lock',
    schema_version: '0.1.0',
    template,
    status: 'passed',
    coordinates: expected,
  }));
}

function run(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: {
      ...process.env,
      npm_config_audit: 'false',
      npm_config_cache: path.join(workRoot, '.npm-cache'),
      npm_config_dry_run: 'false',
      npm_config_fund: 'false',
      npm_config_update_notifier: 'false',
      ...options.env,
    },
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.status !== 0) {
    const details = options.capture ? `\n${result.stdout || ''}\n${result.stderr || ''}` : '';
    throw new Error(`${command} ${args.join(' ')} failed in ${cwd}.${details}`);
  }
  return result.stdout || '';
}

function packCli() {
  const output = run(
    npm,
    ['pack', '--json', '--ignore-scripts', '--pack-destination', workRoot],
    repositoryRoot,
    { capture: true },
  );
  const report = JSON.parse(output)[0];
  assert.ok(report?.filename, 'npm pack must produce one scaffolder archive');
  return path.join(workRoot, report.filename);
}

function generateFromPackedCli(archive, template) {
  const projectDir = path.join(workRoot, template);
  run(npm, [
    'exec', '--yes', '--package', archive, '--',
    'create-kdna-web-app', projectDir,
    '--template', template,
    '--package-manager', 'npm',
    '--no-install',
  ], workRoot);

  const packagePath = path.join(projectDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  assert.equal(pkg.engines?.node, '>=20', `${template} must require Node.js 20 or later`);
  assert.equal(pkg.dependencies['@aikdna/kdna-core'], expectedKDNA['@aikdna/kdna-core']);
  assert.equal(pkg.dependencies['@aikdna/kdna-web-server'], expectedKDNA['@aikdna/kdna-web-server']);
  if (template.startsWith('nextjs')) {
    assert.equal(pkg.dependencies['@aikdna/kdna-react'], expectedKDNA['@aikdna/kdna-react']);
  }
  return projectDir;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 90_000;
  let lastError;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`production server exited before becoming ready (${child.exitCode})`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`server returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`production server did not become ready: ${lastError?.message || 'timeout'}`);
}

function waitForOperationResponse(page, operation) {
  return page.waitForResponse((response) => {
    const pathname = new URL(response.url()).pathname;
    return response.request().method() === 'POST' && pathname === `/api/kdna/${operation}`;
  });
}

async function stopServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  await waitForChildExit(child, 5_000);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL');
    await waitForChildExit(child, 3_000);
  }
  assert.ok(
    child.exitCode !== null || child.signalCode !== null,
    'production server process remained alive after cleanup',
  );
}

function settleWithin(promise, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ settled: false }), timeoutMs);
    promise.then(
      () => {
        clearTimeout(timer);
        resolve({ settled: true });
      },
      (error) => {
        clearTimeout(timer);
        resolve({ settled: true, error });
      },
    );
  });
}

function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    const onExit = () => {
      clearTimeout(timer);
      resolve(true);
    };
    const timer = setTimeout(() => {
      child.off('exit', onExit);
      resolve(false);
    }, timeoutMs);
    child.once('exit', onExit);
  });
}

async function closeBrowser(browser, browserServer, template) {
  const browserProcess = browserServer.process();
  console.log(JSON.stringify({
    schema: 'kdna.scaffolder-browser-cleanup',
    schema_version: '0.1.0',
    template,
    stage: 'normal_close_started',
  }));
  const normal = await settleWithin(browser.close(), 5_000);
  console.log(JSON.stringify({
    schema: 'kdna.scaffolder-browser-cleanup',
    schema_version: '0.1.0',
    template,
    stage: normal.settled ? 'normal_close_settled' : 'normal_close_timed_out',
  }));
  if (!normal.settled || normal.error) {
    console.error(JSON.stringify({
      schema: 'kdna.scaffolder-browser-cleanup',
      schema_version: '0.1.0',
      template,
      normal_close: normal.settled ? 'failed' : 'timed_out',
    }));
  }
  if (browserProcess.exitCode === null && browserProcess.signalCode === null) {
    browserProcess.kill('SIGTERM');
    await waitForChildExit(browserProcess, 3_000);
    console.log(JSON.stringify({
      schema: 'kdna.scaffolder-browser-cleanup',
      schema_version: '0.1.0',
      template,
      stage: 'term_wait_finished',
    }));
  }
  if (browserProcess.exitCode === null && browserProcess.signalCode === null) {
    console.error(JSON.stringify({
      schema: 'kdna.scaffolder-browser-cleanup',
      schema_version: '0.1.0',
      template,
      normal_close: 'timed_out',
      termination: 'forced',
    }));
    browserProcess.kill('SIGKILL');
    await waitForChildExit(browserProcess, 3_000);
    console.log(JSON.stringify({
      schema: 'kdna.scaffolder-browser-cleanup',
      schema_version: '0.1.0',
      template,
      stage: 'kill_wait_finished',
    }));
  }
  assert.ok(
    browserProcess.exitCode !== null || browserProcess.signalCode !== null,
    `${template} Chromium process remained alive after bounded cleanup`,
  );
}

async function exerciseBrowser(projectDir, template, assetPath, protectedAssetPath) {
  const port = await freePort();
  const storageDir = path.join(workRoot, 'storage', template);
  const isNext = template.startsWith('nextjs');
  const args = isNext
    ? [path.join(projectDir, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)]
    : [path.join(projectDir, 'src/server.js')];
  const output = [];
  const child = spawn(node, args, {
    cwd: projectDir,
    env: {
      ...process.env,
      KDNA_STORAGE_DIR: storageDir,
      PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => output.push(chunk.toString()));
  child.stderr.on('data', (chunk) => output.push(chunk.toString()));
  child.once('exit', (code, signal) => {
    console.log(`${template}: production server exited (code=${code}, signal=${signal || 'none'}).`);
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const browserServer = await chromium.launchServer({ headless: true });
  const browser = await chromium.connect(browserServer.wsEndpoint());
  const context = await browser.newContext();
  const page = await context.newPage();
  const failures = [];
  const operations = [];
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`);
  });
  page.on('response', (response) => {
    const pathname = new URL(response.url()).pathname;
    if (['/api/kdna/inspect', '/api/kdna/plan-load', '/api/kdna/load'].includes(pathname)) {
      operations.push([pathname, response.status()]);
    }
  });

  try {
    console.log(`${template}: waiting for production server.`);
    await waitForServer(baseUrl, child);
    console.log(`${template}: opening production page in Chromium.`);
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    console.log(`${template}: uploading accepted public asset.`);
    await page.locator('input[type=file]').setInputFiles(assetPath);
    await page.locator('#kdna-runtime-capsule').waitFor({ state: 'visible', timeout: 60_000 });
    await page.locator('#kdna-status').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelector('#kdna-status')?.textContent === 'loaded');

    const rendered = await page.locator('#kdna-runtime-capsule').textContent();
    assert.ok(rendered, `${template} did not render Runtime Capsule content`);
    assert.match(rendered, /highest_question/u, `${template} did not render projected judgment content`);
    assert.doesNotMatch(rendered, /\[object Object\]/u, `${template} rendered an object as a string coercion`);
    assert.doesNotMatch(rendered, new RegExp(storageDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.deepEqual(operations, [
      ['/api/kdna/inspect', 200],
      ['/api/kdna/plan-load', 200],
      ['/api/kdna/load', 200],
    ], `${template} did not execute the exact inspect -> plan-load -> load HTTP flow`);
    assert.deepEqual(failures, [], `${template} browser failures: ${failures.join('; ')}`);
    console.log(JSON.stringify({
      schema: 'kdna.scaffolder-template-e2e',
      schema_version: '0.1.0',
      template,
      status: 'passed',
      operations,
      rendered_runtime_capsule: true,
    }));
    console.log(`${template}: packed CLI, cold install, production server, and Chromium flow passed.`);

    operations.length = 0;
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    console.log(`${template}: uploading the pinned password-protected Core test vector.`);
    await page.locator('input[type=file]').setInputFiles(protectedAssetPath);
    await page.locator('input[type=password]').waitFor({ state: 'visible', timeout: 60_000 });
    assert.deepEqual(operations, [
      ['/api/kdna/inspect', 200],
      ['/api/kdna/plan-load', 200],
    ], `${template} protected flow did not stop at its locked LoadPlan`);

    const protectedLoadResponse = waitForOperationResponse(page, 'load');
    await page.locator('input[type=password]').fill(protectedTestVectorPassword);
    await page.getByRole('button', { name: 'Unlock', exact: true }).click();
    const loadResponse = await protectedLoadResponse;
    assert.equal(loadResponse.status(), 200, `${template} protected load did not return 200`);
    const loaded = await loadResponse.json();
    assert.equal(loaded.capsule?.type, 'kdna.runtime-capsule');
    assert.equal(loaded.capsule?.asset?.asset_id, 'kdna:fixture:password-envelope');
    assert.equal(loaded.capsule?.access, 'licensed');
    await page.locator('#kdna-runtime-capsule').waitFor({ state: 'visible', timeout: 60_000 });
    await page.waitForFunction(() => document.querySelector('#kdna-status')?.textContent === 'loaded');
    const protectedRendered = await page.locator('#kdna-runtime-capsule').textContent();
    assert.match(protectedRendered, /same protected judgment/u);
    assert.deepEqual(operations, [
      ['/api/kdna/inspect', 200],
      ['/api/kdna/plan-load', 200],
      ['/api/kdna/load', 200],
    ], `${template} protected flow did not execute inspect -> plan-load -> load`);
    assert.deepEqual(failures, [], `${template} protected browser failures: ${failures.join('; ')}`);
    console.log(JSON.stringify({
      schema: 'kdna.scaffolder-protected-template-e2e',
      schema_version: '0.1.0',
      template,
      status: 'passed',
      operations,
      asset_sha256: protectedAssetSha256,
      rendered_runtime_capsule: true,
    }));
  } catch (error) {
    const serverOutput = output.join('').slice(-8_000);
    const body = await page.locator('body').innerText().catch(() => '(body unavailable)');
    console.error(
      `${template}: browser failure before cleanup: ${error.message}\n`
      + `operations=${JSON.stringify(operations)}\n`
      + `browser=${JSON.stringify(failures)}\n`
      + `body=${body.slice(0, 4_000)}\n${serverOutput}`,
    );
    throw new Error(`${template} production browser verification failed: ${error.message}\n${serverOutput}`);
  } finally {
    await context.close();
    await stopServer(child);
    await closeBrowser(browser, browserServer, template);
  }
}

async function main() {
  const browserChild = process.argv[2] === '--browser-child';
  const assetSource = browserChild ? process.argv[5] : process.env.KDNA_TEST_ASSET;
  const protectedAssetSource = browserChild ? process.argv[6] : process.env.KDNA_TEST_PROTECTED_ASSET;
  assert.ok(assetSource, 'KDNA_TEST_ASSET must point to an accepted public .kdna asset');
  const assetPath = path.resolve(assetSource);
  assert.ok(fs.statSync(assetPath).isFile(), 'KDNA_TEST_ASSET must be a file');
  assert.ok(
    protectedAssetSource,
    'KDNA_TEST_PROTECTED_ASSET must point to the pinned public Core password test vector',
  );
  const protectedAssetPath = path.resolve(protectedAssetSource);
  assert.ok(fs.statSync(protectedAssetPath).isFile(), 'KDNA_TEST_PROTECTED_ASSET must be a file');
  const protectedDigest = crypto.createHash('sha256').update(fs.readFileSync(protectedAssetPath)).digest('hex');
  assert.equal(protectedDigest, protectedAssetSha256, 'protected Core test vector digest drifted');
  if (browserChild) {
    const template = process.argv[3];
    const projectDir = process.argv[4];
    assert.ok(['express', 'nextjs-pages', 'nextjs'].includes(template), 'browser child requires a known template');
    assert.ok(projectDir, 'browser child requires an exact generated project directory');
    try {
      await exerciseBrowser(projectDir, template, assetPath, protectedAssetPath);
      fs.rmSync(workRoot, { recursive: true, force: true });
      console.log(JSON.stringify({
        schema: 'kdna.scaffolder-browser-cleanup',
        schema_version: '0.1.0',
        template,
        status: 'passed',
      }));
      process.exit(0);
    } catch (error) {
      console.error(error.stack || error.message);
      fs.rmSync(workRoot, { recursive: true, force: true });
      process.exit(1);
    }
  }
  const archive = packCli();
  const projects = [];

  for (const template of ['express', 'nextjs-pages', 'nextjs']) {
    const projectDir = generateFromPackedCli(archive, template);
    run(npm, ['install', '--ignore-scripts', '--no-audit', '--no-fund'], projectDir);
    assertRegistryLock(projectDir, template);
    run(npm, ['test'], projectDir);
    if (template.startsWith('nextjs')) run(npm, ['run', 'build'], projectDir);
    projects.push([template, projectDir]);
  }

  for (const [template, projectDir] of projects) {
    run(
      node,
      [__filename, '--browser-child', template, projectDir, assetPath, protectedAssetPath],
      repositoryRoot,
    );
  }
}

main()
  .then(() => console.log('All generated templates passed the real production adoption gate.'))
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(() => fs.rmSync(workRoot, { recursive: true, force: true }));
