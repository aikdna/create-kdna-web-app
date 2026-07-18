#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const root = path.resolve(__dirname, '..');
const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'create-kdna-package-manager-'));
const [manager, expectedVersion] = process.argv.slice(2);

function run(command, args, cwd, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    env: {
      ...process.env,
      npm_config_audit: 'false',
      npm_config_cache: path.join(workRoot, '.npm-cache'),
      npm_config_fund: 'false',
      npm_config_update_notifier: 'false',
    },
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed${capture ? `\n${result.stdout}\n${result.stderr}` : ''}`);
  }
  return (result.stdout || '').trim();
}

function packageFromEntry(entryPath, expectedName) {
  let directory = path.dirname(entryPath);
  while (directory !== path.dirname(directory)) {
    const manifestPath = path.join(directory, 'package.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.name === expectedName) return manifest;
    }
    directory = path.dirname(directory);
  }
  throw new Error(`could not find ${expectedName} from ${entryPath}`);
}

try {
  assert.ok(['pnpm', 'yarn'].includes(manager), 'package-manager gate only accepts pnpm or yarn');
  assert.match(expectedVersion || '', /^\d+\.\d+\.\d+$/u, 'package-manager version must be exact SemVer');
  assert.equal(run(manager, ['--version'], root, true), expectedVersion);

  const packReport = JSON.parse(run(
    npm,
    ['pack', '--json', '--ignore-scripts', '--pack-destination', workRoot],
    root,
    true,
  ))[0];
  const archive = path.join(workRoot, packReport.filename);
  assert.ok(fs.statSync(archive).isFile(), 'packed CLI archive must exist');

  const projectDir = path.join(workRoot, `${manager}-nextjs`);
  run(npm, [
    'exec', '--yes', '--package', archive, '--',
    'create-kdna-web-app', projectDir,
    '--template', 'nextjs',
    '--package-manager', manager,
  ], workRoot);

  const expectedLock = manager === 'pnpm' ? 'pnpm-lock.yaml' : 'yarn.lock';
  assert.ok(fs.statSync(path.join(projectDir, expectedLock)).isFile(), `${manager} lockfile must exist`);
  assert.ok(!fs.existsSync(path.join(projectDir, 'package-lock.json')), `${manager} must not create an npm lockfile`);

  for (const [name, version] of Object.entries({
    '@aikdna/kdna-core': '0.20.0',
    '@aikdna/kdna-react': '0.3.0',
    '@aikdna/kdna-web-server': '0.3.0',
  })) {
    const entry = require.resolve(name, { paths: [projectDir] });
    const installed = packageFromEntry(entry, name);
    assert.equal(installed.version, version, `${manager} must install ${name}@${version}`);
  }
  const reactEntry = require.resolve('@aikdna/kdna-react', { paths: [projectDir] });
  const webClientEntry = require.resolve('@aikdna/kdna-web-client', { paths: [path.dirname(reactEntry)] });
  assert.equal(
    packageFromEntry(webClientEntry, '@aikdna/kdna-web-client').version,
    '0.2.2',
    `${manager} must install the React runtime dependency @aikdna/kdna-web-client@0.2.2`,
  );

  run(manager, ['run', 'test'], projectDir);
  run(manager, ['run', 'build'], projectDir);
  console.log(JSON.stringify({
    schema: 'kdna.scaffolder-package-manager',
    schema_version: '0.1.0',
    manager,
    manager_version: expectedVersion,
    template: 'nextjs',
    status: 'passed',
  }));
} finally {
  fs.rmSync(workRoot, { recursive: true, force: true });
}
