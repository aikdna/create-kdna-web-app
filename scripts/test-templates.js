#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const { chromium } = require('playwright');
const { createTempRoot } = require('./tmp-root.cjs');
const { ADOPTION_SKIPPED_FLAG } = require('./ci-leg-definitions');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;
const repositoryRoot = path.resolve(__dirname, '..');
const workRoot = createTempRoot('create-kdna-web-app-production-');
// The legacy templates resolve published coordinates from the npm registry; the
// current basic template binds accepted component-semantics candidates from its
// own vendor directory and keeps its loopback Host in a separate lockfile.
const expectedKDNA = Object.freeze({
  '@aikdna/kdna-core': '0.21.0',
  '@aikdna/kdna-react': '0.4.0',
  '@aikdna/kdna-web-server': '0.3.1',
});
const currentAppKDNA = Object.freeze({
  '@aikdna/kdna-core': 'file:vendor/aikdna-kdna-core-0.24.0-rc.component-semantics.2.tgz',
  '@aikdna/kdna-read': 'file:vendor/aikdna-kdna-read-0.3.0-rc.component-semantics.2.tgz',
  '@aikdna/kdna-web-client': 'file:vendor/aikdna-kdna-web-client-0.5.0-rc.component-semantics.1.tgz',
  '@aikdna/kdna-react': 'file:vendor/aikdna-kdna-react-0.6.0-rc.component-semantics.1.tgz',
});
const currentHostKDNA = Object.freeze({
  '@aikdna/kdna-core': 'file:vendor/aikdna-kdna-core-0.24.0-rc.component-semantics.2.tgz',
  '@aikdna/kdna-read': 'file:vendor/aikdna-kdna-read-0.3.0-rc.component-semantics.2.tgz',
  '@aikdna/kdna-web-server': 'file:vendor/aikdna-kdna-web-server-0.5.0-rc.component-semantics.1.tgz',
});
const currentRegistryPins = Object.freeze({
  next: '16.3.5',
  react: '19.2.7',
  'react-dom': '19.2.7',
});
const protectedAssetSha256 = 'c4486ceacc08d29af2ecdbe6c02818f78b62722592be687f7f0da23130bbe188';
const protectedTestVectorPassword = 'KDNA-TEST-VECTOR-2026';

function assertRegistryLock(projectDir, template) {
  const lock = JSON.parse(fs.readFileSync(path.join(projectDir, 'package-lock.json'), 'utf8'));
  if (template === 'nextjs') {
    const hostLock = JSON.parse(fs.readFileSync(path.join(projectDir, 'host/package-lock.json'), 'utf8'));
    for (const [label, source, coordinates] of [
      ['application', lock, currentAppKDNA],
      ['loopback Host', hostLock, currentHostKDNA],
    ]) {
      for (const [name, coordinate] of Object.entries(coordinates)) {
        const entry = source.packages?.[`node_modules/${name}`];
        assert.equal(entry?.resolved, coordinate, `current ${label} must bind ${name} at ${coordinate}`);
        assert.notEqual(entry?.link, true, `current ${label} cannot link ${name} from a local package`);
        assert.match(entry?.integrity || '', /^sha512-/u, `current ${label} must record integrity for ${name}`);
      }
    }
    for (const [name, version] of Object.entries(currentRegistryPins)) {
      const entry = lock.packages?.[`node_modules/${name}`];
      assert.equal(entry?.version, version, `current application lock must resolve ${name}@${version}`);
      assert.match(
        entry?.resolved || '',
        /^https:\/\/registry\.npmjs\.org\//u,
        `current application lock must resolve ${name} from the npm registry`,
      );
    }
    assert.equal(
      lock.packages?.['node_modules/@aikdna/kdna-web-server'],
      undefined,
      'the current application graph must not hoist the loopback Host graph',
    );
    console.log(JSON.stringify({
      schema: 'kdna.scaffolder-registry-lock',
      schema_version: '0.1.0',
      template,
      status: 'passed',
      coordinates: currentAppKDNA,
      host_coordinates: currentHostKDNA,
      registry_pins: currentRegistryPins,
    }));
    return;
  }
  const expected = {
    '@aikdna/kdna-core': '0.21.0',
    '@aikdna/kdna-web-server': '0.3.1',
    ...(template.startsWith('nextjs')
      ? {
          '@aikdna/kdna-react': '0.4.0',
          '@aikdna/kdna-web-client': '0.3.0',
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
  assert.equal(pkg.engines?.node, '>=22', `${template} must require Node.js 22 or later`);
  if (template === 'nextjs') {
    for (const [name, coordinate] of Object.entries(currentAppKDNA)) {
      assert.equal(pkg.dependencies[name], coordinate, `current application must bind ${name} at ${coordinate}`);
    }
    assert.equal(
      pkg.dependencies['@aikdna/kdna-web-server'],
      undefined,
      'the loopback Host dependency belongs to host/package.json, not the application',
    );
    const hostPkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'host/package.json'), 'utf8'));
    for (const [name, coordinate] of Object.entries(currentHostKDNA)) {
      assert.equal(hostPkg.dependencies[name], coordinate, `current Host must bind ${name} at ${coordinate}`);
    }
  } else {
    assert.equal(pkg.dependencies['@aikdna/kdna-core'], expectedKDNA['@aikdna/kdna-core']);
    assert.equal(pkg.dependencies['@aikdna/kdna-web-server'], expectedKDNA['@aikdna/kdna-web-server']);
    if (template.startsWith('nextjs')) {
      assert.equal(pkg.dependencies['@aikdna/kdna-react'], expectedKDNA['@aikdna/kdna-react']);
    }
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

// The current basic template exposes exactly one KDNA operation. Everything the
// retired LoadPlan surface used to answer must stay unsupported there.
async function assertCurrentReadSurface(baseUrl) {
  const observed = {};
  for (const operation of ['inspect', 'plan-load', 'load']) {
    const response = await fetch(`${baseUrl}/api/kdna/${operation}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    observed[operation] = response.status;
    assert.equal(response.status, 501, `current template must not answer ${operation}`);
    assert.equal((await response.json()).code, 'DEMO_OPERATION_UNSUPPORTED');
  }
  const getRead = await fetch(`${baseUrl}/api/kdna/read`);
  observed['GET read'] = getRead.status;
  await getRead.arrayBuffer();
  assert.equal(getRead.status, 405, 'the current Read route must reject GET');
  console.log(JSON.stringify({
    schema: 'kdna.scaffolder-read-only-surface',
    schema_version: '0.1.0',
    template: 'nextjs',
    status: 'passed',
    operations: observed,
  }));
}

async function exerciseCurrentRead(page, assetPath, judgmentId, operations, failures) {
  const step = async (label, action) => {
    console.log(`nextjs: read step ${label}`);
    return action();
  };
  await step('set-input-files', () => page.locator('input[type=file]').setInputFiles(assetPath));
  // A public Read request is an explicit judgment selection, so the harness
  // supplies a judgment id that exists in the supplied current-contract asset.
  await step('fill-judgment-id', () => page.locator('#judgment-id').fill(judgmentId));
  await step('click-read', () => page.getByRole('button', { name: 'Read', exact: true }).click());
  await step('await-status-visible', () => page.locator('p[aria-atomic="true"]').waitFor({ state: 'visible', timeout: 60_000 }));
  await step('await-status-received', () => page.waitForFunction(
    () => Array.from(document.querySelectorAll('p[aria-atomic="true"]'))
      .some((node) => (node.textContent || '').includes('Read state: received')),
    null,
    { timeout: 60_000 },
  ));

  const view = page.locator('section[aria-label="Remote read result"]');
  await step('await-read-view', () => view.waitFor({ state: 'visible', timeout: 60_000 }));
  const rendered = (await step('read-view-text', () => view.textContent())) || '';
  assert.match(rendered, /Remote read response/u, 'the current template did not render the public Read view');
  assert.match(
    rendered,
    /Response: received; channel: read_envelope; HTTP 200/u,
    'the current template did not receive a ready public read envelope',
  );
  assert.match(rendered, /Asset: /u, 'the current template did not disclose the read asset identity');
  assert.doesNotMatch(rendered, /Content not disclosed/u, 'the current template withheld the accepted read content');
  assert.deepEqual(
    operations,
    [['/api/kdna/read', 200]],
    'the current template must execute exactly one explicit Read request and no retired operation',
  );
  assert.deepEqual(failures, [], `current Read browser failures: ${failures.join('; ')}`);
  console.log(JSON.stringify({
    schema: 'kdna.scaffolder-current-read-e2e',
    schema_version: '0.1.0',
    template: 'nextjs',
    status: 'passed',
    operations,
    rendered_read_view: true,
  }));
  console.log('nextjs: current Read surface, explicit Read flow and Chromium rendering passed.');
}

async function exerciseBrowser(projectDir, template, assetPath, protectedAssetPath, currentAssetPath, currentJudgmentId) {
  const port = await freePort();
  const storageDir = path.join(workRoot, 'storage', template);
  const isCurrent = template === 'nextjs';
  const isNext = template.startsWith('nextjs');
  // The current basic template owns two processes: the application and its
  // separate loopback Host. Its own documented launcher starts both.
  const args = isCurrent
    ? [path.join(projectDir, 'scripts/start-local.mjs'), '--port', String(port), '--host-port', String(port + 1)]
    : isNext
      ? [path.join(projectDir, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)]
      : [path.join(projectDir, 'src/server.js')];
  const output = [];
  const child = spawn(node, args, {
    cwd: projectDir,
    env: {
      ...process.env,
      KDNA_STORAGE_DIR: storageDir,
      PORT: String(port),
      NEXT_TELEMETRY_DISABLED: '1',
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
    if (['/api/kdna/inspect', '/api/kdna/plan-load', '/api/kdna/load', '/api/kdna/read'].includes(pathname)) {
      operations.push([pathname, response.status()]);
    }
  });

  try {
    console.log(`${template}: waiting for production server.`);
    await waitForServer(baseUrl, child);
    console.log(`${template}: opening production page in Chromium.`);
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    if (isCurrent) {
      await assertCurrentReadSurface(baseUrl);
      await exerciseCurrentRead(page, currentAssetPath, currentJudgmentId, operations, failures);
      console.log(JSON.stringify({
        schema: 'kdna.scaffolder-protected-template-e2e',
        schema_version: '0.1.0',
        template,
        status: 'not_run',
        reason: 'the current basic Read contract has no password or LoadPlan flow',
      }));
      return;
    }
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
      + `stack=${error.stack}\n`
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
  const currentAssetSource = browserChild ? process.argv[7] : process.env.KDNA_TEST_CURRENT_ASSET;
  const currentJudgmentId = browserChild ? process.argv[8] : process.env.KDNA_TEST_CURRENT_JUDGMENT_ID;
  // Only the current basic template (nextjs) consumes the current-contract asset. When
  // scripts/ci-leg-receipt.js holds that one adoption check at a registered not_run it
  // invokes this script with ADOPTION_SKIPPED_FLAG, and the other templates' checks must
  // still run rather than be blocked by an asset this leg no longer claims to have.
  const adoptionSkipped = process.argv.includes(ADOPTION_SKIPPED_FLAG);
  const currentAssetRequired = browserChild ? process.argv[3] === 'nextjs' : !adoptionSkipped;
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
  // The current basic template consumes the component-semantics contract, which
  // rejects every pre-component-semantics public reference asset. Its gate leg
  // therefore needs an explicitly authorized current-contract asset.
  let currentAssetPath = null;
  let currentAssetDigest = null;
  if (currentAssetRequired) {
    assert.ok(
      currentAssetSource,
      'KDNA_TEST_CURRENT_ASSET must point to an authorized current-contract .kdna asset',
    );
    currentAssetPath = path.resolve(currentAssetSource);
    assert.ok(fs.statSync(currentAssetPath).isFile(), 'KDNA_TEST_CURRENT_ASSET must be a file');
    currentAssetDigest = crypto.createHash('sha256').update(fs.readFileSync(currentAssetPath)).digest('hex');
    assert.ok(
      currentJudgmentId,
      'KDNA_TEST_CURRENT_JUDGMENT_ID must name a judgment id the current-contract asset discloses',
    );
  }
  if (browserChild) {
    const template = process.argv[3];
    const projectDir = process.argv[4];
    assert.ok(['express', 'nextjs-pages', 'nextjs'].includes(template), 'browser child requires a known template');
    assert.ok(projectDir, 'browser child requires an exact generated project directory');
    try {
      await exerciseBrowser(projectDir, template, assetPath, protectedAssetPath, currentAssetPath, currentJudgmentId);
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
  console.log(JSON.stringify({
    schema: 'kdna.scaffolder-asset-inputs',
    schema_version: '0.1.0',
    legacy_asset: {
      file: path.basename(assetPath),
      bytes: fs.statSync(assetPath).size,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(assetPath)).digest('hex'),
    },
    protected_asset: { file: path.basename(protectedAssetPath), bytes: fs.statSync(protectedAssetPath).size, sha256: protectedDigest },
    current_asset: currentAssetPath === null
      ? null
      : { file: path.basename(currentAssetPath), bytes: fs.statSync(currentAssetPath).size, sha256: currentAssetDigest },
    current_judgment_id: currentJudgmentId ?? null,
    current_basic_adoption: adoptionSkipped ? 'registered-not-run' : 'checked',
  }));
  const archive = packCli();
  const projects = [];

  for (const template of ['express', 'nextjs-pages', 'nextjs']) {
    const projectDir = generateFromPackedCli(archive, template);
    // The current basic template installs its application and its separate
    // loopback Host from two lockfiles through its own public setup command.
    if (template === 'nextjs') run(npm, ['run', 'setup'], projectDir);
    else run(npm, ['install', '--ignore-scripts', '--no-audit', '--no-fund'], projectDir);
    assertRegistryLock(projectDir, template);
    run(npm, ['test'], projectDir);
    if (template.startsWith('nextjs')) run(npm, ['run', 'build'], projectDir);
    projects.push([template, projectDir]);
  }

  if (adoptionSkipped) {
    console.log(
      `KDNA-CI-COVERAGE: current-basic-adoption=registered-not-run templates=nextjs ` +
        'retained=packed-cli-generation,install,product-test,build(express,nextjs-pages,nextjs),chromium-adoption(express,nextjs-pages)',
    );
  }
  for (const [template, projectDir] of projects) {
    if (adoptionSkipped && template === 'nextjs') continue;
    run(
      node,
      [
        __filename,
        '--browser-child',
        template,
        projectDir,
        assetPath,
        protectedAssetPath,
        currentAssetPath ?? '',
        currentJudgmentId ?? '',
      ],
      repositoryRoot,
    );
  }
}

main()
  .then(() => console.log(
    process.argv.includes(ADOPTION_SKIPPED_FLAG)
      ? 'All retained template coverage passed; the current basic template adoption check is registered not_run.'
      : 'All generated templates passed the real production adoption gate.',
  ))
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(() => fs.rmSync(workRoot, { recursive: true, force: true }));
