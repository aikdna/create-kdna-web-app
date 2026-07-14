#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { scaffold } = require('../src/scaffold');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'create-kdna-web-app-production-'));

function run(projectDir, args) {
  const result = spawnSync(npm, args, {
    cwd: projectDir,
    env: {
      ...process.env,
      npm_config_audit: 'false',
      npm_config_cache: path.join(root, '.npm-cache', path.basename(projectDir)),
      npm_config_fund: 'false',
      npm_config_update_notifier: 'false',
    },
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`${npm} ${args.join(' ')} failed for ${path.basename(projectDir)}`);
  }
}

try {
  for (const template of ['express', 'nextjs-pages', 'nextjs']) {
    const projectDir = path.join(root, template);
    scaffold({
      projectName: projectDir,
      template,
      packageManager: 'npm',
      install: false,
    });
    run(projectDir, ['install']);
    run(projectDir, ['test']);
    if (template.startsWith('nextjs')) run(projectDir, ['run', 'build']);
  }
  console.log('All generated templates passed clean install and production checks.');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
