#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// The scaffolder deliberately rejects a target whose ancestors contain a
// symbolic link. On macOS `os.tmpdir()` is reached through `/var`, which is a
// symlink to `/private/var`, so tests and gates must build their work roots from
// the resolved system temporary directory instead of weakening that guard.
function tempRoot() {
  const resolved = fs.realpathSync(os.tmpdir());
  fs.mkdirSync(resolved, { recursive: true });
  return resolved;
}

function createTempRoot(prefix) {
  return fs.mkdtempSync(path.join(tempRoot(), prefix));
}

module.exports = { tempRoot, createTempRoot };
