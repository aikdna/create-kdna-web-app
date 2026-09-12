'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..', 'templates', 'nextjs');
const pins = {
  'vendor/aikdna-kdna-core-0.24.0-rc.component-semantics.2.tgz': 'a9cb3f08735b00657e4848766f0ac517abdcb256121a841f01e662525a0858ea',
  'vendor/aikdna-kdna-read-0.3.0-rc.component-semantics.2.tgz': '43d0f12a1a63a88d26570bfff821919a5cd478fdbd0568bd9c819bc56078b0f0',
  'vendor/aikdna-kdna-web-client-0.5.0-rc.component-semantics.1.tgz': '1a9d90fbdfab35b249da0db16fe7c1099a1b2c3443c02b737461416397367658',
  'vendor/aikdna-kdna-react-0.6.0-rc.component-semantics.1.tgz': '388f182f81dc26e84e4ff6988ff456cdabc5e9fcee20d55b01e4d8996024bcf4',
  'host/vendor/aikdna-kdna-core-0.24.0-rc.component-semantics.2.tgz': 'a9cb3f08735b00657e4848766f0ac517abdcb256121a841f01e662525a0858ea',
  'host/vendor/aikdna-kdna-read-0.3.0-rc.component-semantics.2.tgz': '43d0f12a1a63a88d26570bfff821919a5cd478fdbd0568bd9c819bc56078b0f0',
  'host/vendor/aikdna-kdna-web-server-0.5.0-rc.component-semantics.1.tgz': '4057a84b76d173470c59f95dc0e73af81aa21d36876f6daf4226c1ceaefc7551',
};
for (const [name, sha] of Object.entries(pins)) {
  const file = path.join(root, name);
  assert.equal(fs.lstatSync(file).mode & 0o777, 0o644);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), sha, name);
}
for (const graph of ['', 'host']) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, graph, 'package.json')));
  const lock = JSON.parse(fs.readFileSync(path.join(root, graph, 'package-lock.json')));
  assert.deepEqual(lock.packages[''].dependencies, pkg.dependencies);
  for (const [name, coordinate] of Object.entries(pkg.dependencies)) {
    if (!name.startsWith('@aikdna/')) continue;
    assert.ok(coordinate.startsWith('file:vendor/'));
    assert.equal(lock.packages[`node_modules/${name}`].resolved, coordinate);
  }
}
const page = fs.readFileSync(path.join(root, 'app/page.jsx'), 'utf8');
assert.match(page, /useKDNARead/);
assert.match(page, /KDNAReadView/);
assert.doesNotMatch(page, /KDNALoadPlanGate|KDNAFileDropzone|\/plan-load|dangerouslySetInnerHTML/);
const setup = fs.readFileSync(path.join(root, 'scripts/install.mjs'), 'utf8');
assert.match(setup, /path\.join\(app, 'host'\)/);
assert.match(setup, /'ci', '--ignore-scripts'/);
console.log('Basic template exact two-graph and explicit Read structure passed; not a browser or release receipt.');
