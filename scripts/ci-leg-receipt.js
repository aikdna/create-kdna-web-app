#!/usr/bin/env node
'use strict';

// CI leg gate for the production template leg.
//
// Exactly three outcomes are allowed, and they are distinguishable:
//   * required configuration missing  -> `KDNA-CI-CONFIG-MISSING` on stderr, exit 2, and
//     no receipt is printed;
//   * the leg is registered in fixtures/ci-leg-registry.json AND the unavailability codes
//     recomputed from the committed bytes are exactly the registered codes -> the retained
//     coverage runs for real, then exactly one `KDNA-CI-NOT-RUN:` line plus one
//     machine-readable `KDNA-CI-RECEIPT:` line are printed, exit 0;
//   * otherwise -> the real leg command runs and its exit status becomes this process's
//     exit status, with one `run` receipt.
//
// Two properties keep the not_run honest:
//
//   1. The retained coverage is not a silent skip. When the registered codes hold, the
//      gate runs scripts/test-templates.js with the registered-skip flag, so the packed-CLI
//      generation, install, product test and build of every template, plus the Chromium
//      adoption checks that do not consume a current-contract asset, still run and can
//      still fail this gate.
//   2. The codes are recomputed, and compared in both directions. A code the gate computes
//      but the registry does not name, or a registered code that is no longer true, makes
//      the gate run the full leg instead.
//
// scripts/verify-ci-leg-receipts.js re-derives the same codes independently and refuses a
// receipt that disagrees or is not bound to the sha256 digests of the committed inputs.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  ADOPTION_SKIPPED_FLAG,
  LEGS,
  REGISTRY_PATH,
  entryExpired,
  loadLegRegistry,
  registrationFor,
  sameCodeSet,
  unavailabilityCodes,
} = require('./ci-leg-definitions');

const NOT_RUN_PREFIX = 'KDNA-CI-NOT-RUN:';
const RECEIPT_PREFIX = 'KDNA-CI-RECEIPT:';
const root = path.resolve(__dirname, '..');
const LEG = 'template-productions';
const DEFINITION = LEGS[LEG];
const DIGEST_INPUTS = Object.freeze([
  REGISTRY_PATH,
  'package.json',
  path.join('scripts', 'test-templates.js'),
  path.join('.github', 'workflows', 'ci.yml'),
  ...Object.freeze([path.join('templates', 'nextjs', 'package.json'), path.join('templates', 'nextjs', 'host', 'package.json')]),
]);

function digestInputs() {
  return Object.fromEntries(DIGEST_INPUTS.map((relative) => [
    relative,
    crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex'),
  ]));
}

function receipt(payload) {
  return `${RECEIPT_PREFIX} ${JSON.stringify(payload)}`;
}

function runLeg(args) {
  const [command, ...prefixArgs] = DEFINITION.command;
  const result = spawnSync(process.execPath, [path.resolve(root, command), ...prefixArgs, ...args], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`${LEG} was interrupted by ${result.signal}`);
  return result.status;
}

function main(argv) {
  if (argv.length !== 1 || !Object.hasOwn(LEGS, argv[0])) {
    console.error(`usage: node scripts/ci-leg-receipt.js <${Object.keys(LEGS).join('|')}>`);
    return 2;
  }
  const missing = DEFINITION.requires.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(`KDNA-CI-CONFIG-MISSING: ${LEG} missing=${missing.join(',')}`);
    return 2;
  }

  const registry = loadLegRegistry(root);
  const registration = registrationFor(registry, LEG);
  const computed = unavailabilityCodes(root, process.env);
  const registeredCodes = registration?.unavailable_codes ?? [];
  const canBeNotRun =
    Boolean(registration) &&
    !entryExpired(registration) &&
    sameCodeSet(computed.codes, registeredCodes);

  if (canBeNotRun) {
    // The retained coverage runs first, for real. If it fails, the gate fails: a not_run
    // may never hide a failure of the coverage this leg still claims to keep.
    const retained = runLeg([ADOPTION_SKIPPED_FLAG]);
    if (retained !== 0) {
      console.error(
        `${LEG} gate: the retained coverage failed (status=${retained}) while the leg was held at not_run; ` +
          'a registered not_run may never hide a failure of the coverage the leg still keeps.',
      );
      return retained;
    }
    console.log(
      `${NOT_RUN_PREFIX} ${LEG} reason=${registration.reason} object=${DEFINITION.object} ` +
        `unavailable=${[...computed.codes].sort().join(',')}`,
    );
    console.log(receipt({
      leg: LEG,
      class: 'not_run',
      reason: registration.reason,
      object: DEFINITION.object,
      basis: registration.basis,
      unavailable_codes: [...computed.codes].sort(),
      code_detail: computed.detail,
      retained_coverage: DEFINITION.retained_coverage,
      not_covered: DEFINITION.not_covered,
      retained_status: retained,
      command: [`node`, ...DEFINITION.command, ADOPTION_SKIPPED_FLAG],
      inputs: digestInputs(),
    }));
    return 0;
  }

  const status = runLeg([]);
  console.log(receipt({
    leg: LEG,
    class: 'run',
    command: ['node', ...DEFINITION.command],
    status,
    unavailable_codes: [...computed.codes].sort(),
    inputs: digestInputs(),
  }));
  return status;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { LEG, main };
