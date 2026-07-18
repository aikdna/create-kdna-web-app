#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function verifyReleaseEvent({ action, isDraft, isPrerelease }) {
  assert(action === 'published', 'release event action must be exactly published');
  assert(isDraft === 'false', 'draft releases cannot publish packages');
  assert(isPrerelease === 'false', 'prereleases cannot publish stable packages');
}

function verifyReleaseContext({ packageJson, packageLock, changelog, releaseTag }) {
  const version = packageJson?.version;
  assert(/^\d+\.\d+\.\d+$/u.test(version), 'package version must be an exact natural SemVer coordinate');
  assert(releaseTag === version, `release tag must be exactly ${version}`);
  assert(packageLock?.version === version, 'package-lock root version must match package version');
  assert(packageLock?.packages?.['']?.version === version, 'package-lock package version must match package version');
  const headings = String(changelog).split(/\r?\n/u).filter((line) => /^##(?!#)/u.test(line));
  const parsedHeadings = headings.map((line) => {
    const match = /^## (\d+\.\d+\.\d+) \((\d{4}-\d{2}-\d{2})\)$/u.exec(line);
    assert(match, 'every CHANGELOG release heading must be exactly ## x.y.z (YYYY-MM-DD)');
    const date = new Date(`${match[2]}T00:00:00Z`);
    assert(
      !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === match[2],
      `CHANGELOG release heading has an invalid date: ${line}`,
    );
    return { line, version: match[1] };
  });
  assert(parsedHeadings[0]?.version === version, `first CHANGELOG release heading must be ${version}`);
  assert(parsedHeadings.filter((heading) => heading.version === version).length === 1, 'CHANGELOG release heading must be unique');
  assert(packageJson?.engines?.node === '>=20', 'release must preserve the Node 20 floor');
  assert(packageJson?.devDependencies?.playwright === '1.61.1', 'browser gate must use exact Playwright 1.61.1');
  assert(packageLock?.packages?.['']?.devDependencies?.playwright === '1.61.1', 'lock must declare exact Playwright 1.61.1');
  assert(packageLock?.packages?.['node_modules/playwright']?.version === '1.61.1', 'lock must resolve Playwright 1.61.1');
}

function verifyGitRelease({ head, tagCommit, isOnOriginMain }) {
  assert(/^[0-9a-f]{40}$/u.test(head), 'release HEAD must be an exact commit');
  assert(tagCommit === head, 'release HEAD must equal the release tag commit');
  assert(isOnOriginMain === true, 'release commit must be an ancestor of origin/main');
}

function main() {
  const root = path.resolve(__dirname, '..');
  try {
    verifyReleaseEvent({
      action: process.env.RELEASE_EVENT_ACTION,
      isDraft: process.env.RELEASE_IS_DRAFT,
      isPrerelease: process.env.RELEASE_IS_PRERELEASE,
    });
    verifyReleaseContext({
      packageJson: JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')),
      packageLock: JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8')),
      changelog: fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'),
      releaseTag: process.env.RELEASE_TAG,
    });
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    const tagCommit = execFileSync(
      'git', ['rev-parse', `${process.env.RELEASE_TAG}^{commit}`],
      { cwd: root, encoding: 'utf8' },
    ).trim();
    const ancestry = spawnSync(
      'git', ['merge-base', '--is-ancestor', head, 'origin/main'],
      { cwd: root, encoding: 'utf8' },
    );
    verifyGitRelease({ head, tagCommit, isOnOriginMain: ancestry.status === 0 });
    console.log('Release event, tag, exact HEAD, origin/main ancestry, package, lock, browser gate, and CHANGELOG context passed.');
  } catch (error) {
    console.error(`Release context rejected: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();
module.exports = { verifyGitRelease, verifyReleaseContext, verifyReleaseEvent };
