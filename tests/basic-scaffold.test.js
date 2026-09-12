'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { createTempRoot } = require('../scripts/tmp-root.cjs');
const { scaffold } = require('../src/scaffold');
const root = path.join(__dirname, '..');
const fresh = () => createTempRoot('basic-scaffold-test-');

test('generation preserves binary tar bytes and modes for both independent graphs', () => {
  const out = path.join(fresh(), 'binary-project');
  scaffold({ projectName: out, template: 'nextjs', packageManager: 'npm', install: false });
  for (const graph of ['', 'host']) {
    for (const name of fs.readdirSync(path.join(root, 'templates/nextjs', graph, 'vendor'))) {
      const source = path.join(root, 'templates/nextjs', graph, 'vendor', name);
      const target = path.join(out, graph, 'vendor', name);
      assert.deepEqual(fs.readFileSync(target), fs.readFileSync(source));
      assert.equal(fs.statSync(target).mode & 0o777, fs.statSync(source).mode & 0o777);
    }
    assert.equal(fs.existsSync(path.join(out, graph, 'node_modules')), false);
    const pkg = JSON.parse(fs.readFileSync(path.join(out, graph, 'package.json')));
    const lock = JSON.parse(fs.readFileSync(path.join(out, graph, 'package-lock.json')));
    assert.equal(pkg.name, graph ? 'binary-project-host' : 'binary-project');
    assert.equal(lock.name, pkg.name);
    assert.equal(lock.packages[''].name, pkg.name);
  }
});

test('no-install advertises the same public two-graph setup and invokes no installer', () => {
  const parent = fresh();
  const result = spawnSync(process.execPath, [path.join(root, 'bin/create-kdna-web-app.js'), 'normal-path', '--no-install'], {
    cwd: parent, env: { ...process.env, PATH: '/nonexistent' }, encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /npm run setup/);
  assert.equal(fs.existsSync(path.join(parent, 'normal-path/node_modules')), false);
  assert.equal(fs.existsSync(path.join(parent, 'normal-path/host/node_modules')), false);
});

test('current basic non-npm installation rejects before creating output', () => {
  for (const packageManager of ['pnpm', 'yarn']) {
    const out = path.join(fresh(), 'unsupported-current');
    assert.throws(() => scaffold({ projectName: out, template: 'nextjs', packageManager, install: true }), /supports npm only/);
    assert.equal(fs.existsSync(out), false);
  }
});

test('a missing installer fails the real generated setup without claiming success', () => {
  const out = path.join(fresh(), 'missing-installer');
  const result = spawnSync(process.execPath, [path.join(root, 'bin/create-kdna-web-app.js'), out], {
    env: { ...process.env, PATH: '/nonexistent', npm_config_user_agent: 'npm' }, encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /application installation failed/i);
  assert.doesNotMatch(result.stdout, /Created missing-installer/);
  assert.equal(fs.existsSync(path.join(out, 'host/node_modules')), false);
});

test('target symlinks and symlink ancestors are rejected without altering their referents', () => {
  const parent = fresh(), target = path.join(parent, 'real'); fs.mkdirSync(target);
  const alias = path.join(parent, 'alias'); fs.symlinkSync(target, alias);
  for (const projectName of [alias, path.join(alias, 'nested')]) {
    assert.throws(() => scaffold({ projectName, template: 'nextjs', packageManager: 'npm', install: false }), /symbolic link/);
  }
  assert.deepEqual(fs.readdirSync(target), []);
});

test('unsafe template symlinks reject before output; literal source placeholders stay literal', () => {
  const isolated = path.join(fresh(), 'cli');
  fs.cpSync(root, isolated, { recursive: true, filter: source => !source.includes('node_modules') });
  const template = path.join(isolated, 'templates/nextjs');
  fs.writeFileSync(path.join(template, 'literal.bin'), Buffer.from([0, 255, 123, 123, 125, 125]));
  fs.writeFileSync(path.join(template, 'literal.js'), 'const text = "{{projectName}}";\n');
  fs.chmodSync(path.join(template, 'literal.js'), 0o755);
  const out = path.join(fresh(), 'literal-project');
  execFileSync(process.execPath, [path.join(isolated, 'bin/create-kdna-web-app.js'), out, '--no-install']);
  assert.equal(fs.readFileSync(path.join(out, 'literal.js'), 'utf8'), 'const text = "{{projectName}}";\n');
  assert.deepEqual(fs.readFileSync(path.join(out, 'literal.bin')), Buffer.from([0, 255, 123, 123, 125, 125]));
  assert.equal(fs.statSync(path.join(out, 'literal.js')).mode & 0o777, 0o755);
  fs.symlinkSync(path.join(template, 'package.json'), path.join(template, 'unsafe-link'));
  const denied = path.join(fresh(), 'denied');
  const result = spawnSync(process.execPath, [path.join(isolated, 'bin/create-kdna-web-app.js'), denied, '--no-install'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unsafe template entry/);
  assert.equal(fs.existsSync(denied), false);
});
