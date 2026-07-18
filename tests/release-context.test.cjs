'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  verifyGitRelease,
  verifyReleaseContext,
  verifyReleaseEvent,
} = require('../scripts/verify-release-context.cjs');

function fixture() {
  return {
    packageJson: {
      version: '0.4.0',
      engines: { node: '>=20' },
      devDependencies: { playwright: '1.61.1' },
    },
    packageLock: {
      version: '0.4.0',
      packages: {
        '': { version: '0.4.0', devDependencies: { playwright: '1.61.1' } },
        'node_modules/playwright': { version: '1.61.1' },
      },
    },
    changelog: '# Changelog\n\n## 0.4.0 (2026-07-18)\n\n- Current release.\n',
    releaseTag: '0.4.0',
  };
}

test('release context accepts the exact stable release boundary', () => {
  verifyReleaseEvent({ action: 'published', isDraft: 'false', isPrerelease: 'false' });
  verifyReleaseContext(fixture());
  verifyGitRelease({
    head: 'a'.repeat(40),
    tagCommit: 'a'.repeat(40),
    isOnOriginMain: true,
  });
});

test('release context rejects mutable or mismatched release inputs', () => {
  assert.throws(
    () => verifyReleaseEvent({
      action: ['workflow', 'dispatch'].join('_'),
      isDraft: 'false',
      isPrerelease: 'false',
    }),
    /exactly published/u,
  );
  assert.throws(
    () => verifyReleaseContext({ ...fixture(), releaseTag: ['v', '0.4.0'].join('') }),
    /release tag/u,
  );
  const drift = fixture();
  drift.packageJson.devDependencies.playwright = '^1.61.1';
  assert.throws(() => verifyReleaseContext(drift), /exact Playwright/u);
  assert.throws(
    () => verifyReleaseContext({
      ...fixture(),
      changelog: '# Changelog\n\n## 0.4.0 arbitrary\n',
    }),
    /exactly ## x\.y\.z/u,
  );
  assert.throws(
    () => verifyGitRelease({
      head: 'a'.repeat(40),
      tagCommit: 'b'.repeat(40),
      isOnOriginMain: true,
    }),
    /tag commit/u,
  );
  assert.throws(
    () => verifyGitRelease({
      head: 'a'.repeat(40),
      tagCommit: 'a'.repeat(40),
      isOnOriginMain: false,
    }),
    /origin\/main/u,
  );
});
