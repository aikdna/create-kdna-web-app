#!/usr/bin/env node
'use strict';

// Independent gate over the production template leg receipt mechanism.
//
// The receipt generator (scripts/ci-leg-receipt.js) is never trusted about its own
// verdict. This verifier re-derives, from the committed bytes, the unavailability codes
// the leg is allowed to report, then requires the gate's machine-readable receipt to
// agree: the leg name, the class, the registered reason and object, the code set in both
// directions, and the sha256 digests of the exact committed input files the receipt
// claims to have read.
//
// It also proves the not_run mechanism is not self-suppressing: it builds a sandbox in
// which both registered codes are gone (the job supplies a current-contract asset, and
// the committed templates no longer bind the component-semantics contract alone) and
// requires the gate to run the leg instead of printing not_run.
//
// usage: node scripts/verify-ci-leg-receipts.js [--root <tree>]

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
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
const LEG = 'template-productions';
const DIGEST_INPUTS = [
  REGISTRY_PATH,
  'package.json',
  path.join('scripts', 'test-templates.js'),
  path.join('.github', 'workflows', 'ci.yml'),
  path.join('templates', 'nextjs', 'package.json'),
  path.join('templates', 'nextjs', 'host', 'package.json'),
];
const GATE_SCRIPTS = Object.freeze([
  path.join('scripts', 'ci-leg-receipt.js'),
  path.join('scripts', 'ci-leg-definitions.js'),
]);

/** Copy the committed inputs and the gate itself into a sandbox tree. */
function buildSandbox(root, sandbox) {
  for (const relative of [...DIGEST_INPUTS, ...GATE_SCRIPTS]) {
    fs.mkdirSync(path.dirname(path.join(sandbox, relative)), { recursive: true });
    fs.copyFileSync(path.join(root, relative), path.join(sandbox, relative));
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function digestOf(root, relative) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');
}

function expectedDigests(root) {
  return Object.fromEntries(DIGEST_INPUTS.map((relative) => [relative, digestOf(root, relative)]));
}

function onlyOne(stdout, prefix) {
  const lines = stdout.split('\n').filter((line) => line.startsWith(prefix));
  assert.equal(lines.length, 1, `expected exactly one ${prefix} line, got ${lines.length}:\n${stdout}`);
  return lines[0];
}

function parseReceipt(stdout) {
  return JSON.parse(onlyOne(stdout, RECEIPT_PREFIX).slice(RECEIPT_PREFIX.length));
}

function runGate(root, environment, args = []) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', 'ci-leg-receipt.js'), LEG, ...args], {
    cwd: root,
    env: environment,
    encoding: 'utf8',
  });
}

function environmentWithout() {
  const environment = { ...process.env };
  for (const name of [...LEGS[LEG].requires, 'KDNA_TEST_CURRENT_ASSET', 'KDNA_TEST_CURRENT_JUDGMENT_ID']) {
    delete environment[name];
  }
  return environment;
}

function environmentWith() {
  return {
    ...process.env,
    KDNA_TEST_ASSET: process.env.KDNA_TEST_ASSET ?? 'public-assets/references/public/laozi-wuwei/laozi-wuwei-0.1.1.kdna',
    KDNA_TEST_PROTECTED_ASSET: process.env.KDNA_TEST_PROTECTED_ASSET ?? 'public-core/fixtures/test_protected_entry.kdna',
  };
}

function checkConfigMissing(root, findings) {
  const result = runGate(root, environmentWithout(), []);
  if (result.status !== 2) {
    findings.push({ check: 'config_missing_exit', detail: `expected exit 2, got ${result.status}` });
  }
  if (!result.stderr.includes(`KDNA-CI-CONFIG-MISSING: ${LEG} missing=`)) {
    findings.push({ check: 'config_missing_diagnostic', detail: result.stderr.trim() });
  }
  if (result.stdout.includes(RECEIPT_PREFIX) || result.stdout.includes(NOT_RUN_PREFIX)) {
    findings.push({ check: 'config_missing_emitted_receipt', detail: result.stdout.trim() });
  }
}

function checkReceipt(root, findings) {
  const registry = loadLegRegistry(root);
  const registration = registrationFor(registry, LEG);
  if (!registration) {
    findings.push({ leg: LEG, check: 'leg_not_registered' });
    return undefined;
  }
  const environment = environmentWith();
  const computed = unavailabilityCodes(root, environment);
  const registeredCodes = new Set(registration.unavailable_codes ?? []);
  for (const code of computed.codes) {
    if (!registeredCodes.has(code)) findings.push({ leg: LEG, check: 'unregistered_unavailability_code', detail: code });
  }
  for (const code of registeredCodes) {
    if (!computed.codes.includes(code)) findings.push({ leg: LEG, check: 'registered_code_no_longer_true', detail: code });
  }
  if (typeof registration.trigger !== 'string' || registration.trigger.length < 64) {
    findings.push({ leg: LEG, check: 'registration_without_trigger' });
  }
  if (typeof registration.basis !== 'string' || registration.basis.length < 64) {
    findings.push({ leg: LEG, check: 'registration_without_basis' });
  }
  if (entryExpired(registration)) {
    findings.push({ leg: LEG, check: 'registration_expired', detail: registration.review_by });
  }

  // The retained coverage is the real leg minus the registered adoption check. This
  // verifier runs it by shimming the leg script only far enough to observe the gate's
  // decision, so the check stays about the gate and not about installing three templates.
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'kdna-create-kdna-ci-leg-'));
  try {
    buildSandbox(root, sandbox);
    let sawSkippedFlag = false;
    fs.writeFileSync(
      path.join(sandbox, 'scripts', 'test-templates.js'),
      "'use strict';\n"
        + `if (!process.argv.includes(${JSON.stringify(ADOPTION_SKIPPED_FLAG)})) {\n`
        + "  console.error('verify-ci-leg-receipts: the gate ran the full leg while the registration held');\n"
        + '  process.exit(9);\n'
        + '}\n'
        + "console.log('verify-ci-leg-receipts: retained coverage shim');\n",
    );
    const result = runGate(sandbox, environment, []);
    sawSkippedFlag = !result.stderr.includes('ran the full leg while the registration held');
    if (!sawSkippedFlag) {
      findings.push({ leg: LEG, check: 'retained_coverage_flag', detail: 'the gate did not hold the adoption check at the registered skip' });
    }
    let receipt;
    try {
      receipt = parseReceipt(result.stdout);
    } catch (error) {
      findings.push({ leg: LEG, check: 'receipt_unreadable', detail: `${error.message} | status=${result.status} stderr=${result.stderr.trim()}` });
      return undefined;
    }
    const expected = sameCodeSet(computed.codes, registration.unavailable_codes ?? []) ? 'not_run' : 'run';
    if (result.status !== 0 && expected === 'not_run') {
      findings.push({ leg: LEG, check: 'not_run_exit', detail: String(result.status) });
    }
    try {
      assert.deepEqual(receipt.inputs, expectedDigests(sandbox));
    } catch {
      findings.push({
        leg: LEG,
        check: 'receipt_input_digest',
        detail: 'the receipt is not bound to the sha256 digests of the committed input files',
      });
    }
    if (expected !== 'not_run') {
      // The registration no longer holds: the gate must have run the leg, not held it.
      if (receipt.class !== 'run') {
        findings.push({ leg: LEG, check: 'receipt_class', detail: `expected run, got ${String(receipt.class)}` });
      }
      return receipt;
    }
    try {
      onlyOne(result.stdout, NOT_RUN_PREFIX);
    } catch (error) {
      findings.push({ leg: LEG, check: 'not_run_line', detail: error.message });
    }
    if (receipt.class !== 'not_run') findings.push({ leg: LEG, check: 'not_run_class', detail: String(receipt.class) });
    if (receipt.reason !== registration.reason) findings.push({ leg: LEG, check: 'not_run_reason', detail: String(receipt.reason) });
    if (receipt.object !== LEGS[LEG].object) findings.push({ leg: LEG, check: 'not_run_object', detail: String(receipt.object) });
    if (!sameCodeSet(receipt.unavailable_codes ?? [], registration.unavailable_codes ?? [])) {
      findings.push({ leg: LEG, check: 'not_run_codes', detail: (receipt.unavailable_codes ?? []).join(',') });
    }
    if (receipt.retained_status !== 0) findings.push({ leg: LEG, check: 'retained_status', detail: String(receipt.retained_status) });
    return receipt;
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

// Build a sandbox whose committed bytes satisfy no registered code, and require the gate
// to run the leg instead of printing not_run.
function checkNotRunIsFalsifiable(root, findings) {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'kdna-create-kdna-ci-leg-falsify-'));
  try {
    buildSandbox(root, sandbox);
    // The leg command is shimmed: this check is about the gate's decision.
    let usedFullLeg = false;
    fs.writeFileSync(
      path.join(sandbox, 'scripts', 'test-templates.js'),
      "'use strict';\n"
        + `if (process.argv.includes(${JSON.stringify(ADOPTION_SKIPPED_FLAG)})) {\n`
        + "  console.error('verify-ci-leg-receipts: the gate held the registered skip after the codes were removed');\n"
        + '  process.exit(9);\n'
        + '}\n'
        + 'process.exit(0);\n',
    );
    // 1. The job supplies a current-contract asset.
    const environment = {
      ...environmentWith(),
      KDNA_TEST_CURRENT_ASSET: 'authorized-current-contract.kdna',
      KDNA_TEST_CURRENT_JUDGMENT_ID: 'falsification-probe',
    };
    // 2. The committed workflow names it, so the second code is gone as well.
    const workflow = fs.readFileSync(path.join(sandbox, '.github', 'workflows', 'ci.yml'), 'utf8');
    fs.writeFileSync(
      path.join(sandbox, '.github', 'workflows', 'ci.yml'),
      `${workflow}\n# KDNA_TEST_CURRENT_ASSET: authorization-probe\n`,
    );
    // 3. The committed templates no longer bind the component-semantics contract alone.
    for (const relative of [path.join('templates', 'nextjs', 'package.json'), path.join('templates', 'nextjs', 'host', 'package.json')]) {
      const manifest = readJson(path.join(sandbox, relative));
      const holder = manifest.dependencies?.['@aikdna/kdna-core'] ? 'dependencies' : 'devDependencies';
      manifest[holder]['@aikdna/kdna-core'] = '0.21.0';
      fs.writeFileSync(path.join(sandbox, relative), `${JSON.stringify(manifest, null, 2)}\n`);
    }
    const result = runGate(sandbox, environment, []);
    usedFullLeg = result.status === 0 && !result.stdout.includes(NOT_RUN_PREFIX);
    if (!usedFullLeg) {
      findings.push({
        leg: LEG,
        check: 'not_run_is_permanent',
        detail: `every registered code was removed and the gate did not run the leg (status=${result.status}): ${result.stdout.trim()} ${result.stderr.trim()}`,
      });
      return;
    }
    let receipt;
    try {
      receipt = parseReceipt(result.stdout);
    } catch (error) {
      findings.push({ leg: LEG, check: 'falsification_receipt', detail: error.message });
      return;
    }
    if (receipt.class !== 'run') findings.push({ leg: LEG, check: 'falsification_class', detail: String(receipt.class) });
  } catch (error) {
    findings.push({ leg: LEG, check: 'falsification_error', detail: error.message });
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

function verify(root) {
  const findings = [];
  checkConfigMissing(root, findings);
  const receipt = checkReceipt(root, findings);
  checkNotRunIsFalsifiable(root, findings);
  return { findings, receipts: receipt ? [receipt] : [] };
}

function main(argv) {
  const rootIndex = argv.indexOf('--root');
  const root = rootIndex === -1 ? path.resolve(__dirname, '..') : path.resolve(argv[rootIndex + 1]);
  const { findings, receipts } = verify(root);
  if (findings.length > 0) {
    console.log(`KDNA-CI-LEG-RECEIPTS: findings=${findings.length} root=${root} ${JSON.stringify(findings)}`);
    return 1;
  }
  const classes = receipts.map((entry) => `${entry.leg}=${entry.class}`).join(',');
  console.log(`KDNA-CI-LEG-RECEIPTS: ok root=${root} legs=${receipts.length} ${classes}`);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { verify };
