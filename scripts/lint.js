#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const { readdirSync, statSync } = require('node:fs');
const path = require('node:path');

const roots = ['bin', 'src', 'tests', 'scripts', 'templates'].filter((root) => {
  try {
    return statSync(root).isDirectory();
  } catch {
    return false;
  }
});

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (full.endsWith('.js') || full.endsWith('.mjs')) files.push(full);
  }
  return files;
}

const files = roots.flatMap(walk);
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status);
}

console.log(`Checked ${files.length} JavaScript files.`);
