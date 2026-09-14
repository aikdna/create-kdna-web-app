#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createTempRoot } = require('./tmp-root.cjs');
const { verifyGeneratedProject, verifyUnsupportedInstall } = require('./package-manager-contract.js');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const root = path.resolve(__dirname, '..');
const [manager, expectedVersion] = process.argv.slice(2);
const workRoot = createTempRoot('create-kdna-package-manager-');
function invoke(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    env: { ...process.env, npm_config_audit: 'false', npm_config_cache: path.join(workRoot, '.npm-cache'), npm_config_fund: 'false', npm_config_update_notifier: 'false' },
    timeout: 120_000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
}
function run(command, args, cwd) {
  const result = invoke(command, args, cwd);
  assert.equal(result.status, 0, command + ' failed: ' + result.stdout + result.stderr);
  return (result.stdout || '').trim();
}
try {
  assert.ok(['pnpm', 'yarn'].includes(manager), 'package-manager gate only accepts pnpm or yarn');
  assert.match(expectedVersion || '', /^\d+\.\d+\.\d+$/u, 'package-manager version must be exact SemVer');
  assert.equal(run(manager, ['--version'], root), expectedVersion);
  const report = JSON.parse(run(npm, ['pack', '--json', '--ignore-scripts', '--pack-destination', workRoot], root))[0];
  const archive = path.join(workRoot, report.filename);
  assert.ok(fs.statSync(archive).isFile(), 'packed CLI archive must exist');
  const projectDir = path.join(workRoot, manager + '-nextjs');
  const packedCli = ['exec', '--yes', '--package', archive, '--', 'create-kdna-web-app'];
  const options = ['--template', 'nextjs', '--package-manager', manager];
  // Generation retains both npm lockfiles and exact bundled graphs without installing.
  const output = run(npm, [...packedCli, projectDir, ...options, '--no-install'], workRoot);
  assert.match(output, /npm run setup/u, 'generation must explain the supported setup command');
  verifyGeneratedProject(projectDir, path.join(root, 'templates/nextjs'));
  // A generic failure, successful install, or partially written project cannot pass.
  const deniedDir = path.join(workRoot, manager + '-unsupported-install');
  verifyUnsupportedInstall(invoke(npm, [...packedCli, deniedDir, ...options], workRoot), deniedDir);
  console.log(JSON.stringify({ schema: 'kdna.scaffolder-package-manager', schema_version: '0.1.0', manager,
    manager_version: expectedVersion, template: 'nextjs', status: 'passed',
    generation_without_install: 'verified', installation: 'unsupported_refusal_verified', supported_installer: 'npm' }));
} finally {
  fs.rmSync(workRoot, { recursive: true, force: true });
}
