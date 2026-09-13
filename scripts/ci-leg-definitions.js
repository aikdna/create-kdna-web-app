'use strict';

// Shared, committed definitions for the gated production template leg.
//
// The registry (fixtures/ci-leg-registry.json) is the only authority that may hold this
// leg at not_run. The gate (scripts/ci-leg-receipt.js) and the independent verifier
// (scripts/verify-ci-leg-receipts.js) both read these definitions; the verifier never
// trusts the gate's own view of them.
//
// A not_run outcome requires BOTH an explicit registration here AND the exact set of
// unavailability codes the gate recomputes from the committed bytes. The set is compared
// in both directions, so a code the gate computes but the registry does not name, or a
// registered code that is no longer true, makes the leg run instead. A gate cannot
// manufacture a permanent not_run out of a condition of its own.

const fs = require('node:fs');
const path = require('node:path');

const REGISTRY_PATH = path.join('fixtures', 'ci-leg-registry.json');
const WORKFLOW_PATH = path.join('.github', 'workflows', 'ci.yml');
const CURRENT_TEMPLATE_MANIFESTS = Object.freeze([
  path.join('templates', 'nextjs', 'package.json'),
  path.join('templates', 'nextjs', 'host', 'package.json'),
]);
const CURRENT_CONTRACT_MARKER = 'component-semantics';

const CODE_TEMPLATES_BIND_CURRENT_CONTRACT = 'templates_bind_current_component_contract';
const CODE_CURRENT_CONTRACT_ASSET_NOT_SUPPLIED = 'current_contract_asset_not_supplied';

const ADOPTION_SKIPPED_FLAG = '--current-basic-adoption=skipped-registered';

const LEGS = Object.freeze({
  'template-productions': {
    object: "the current basic template's Chromium adoption leg driven with an authorized current-contract .kdna asset",
    requires: Object.freeze(['KDNA_TEST_ASSET', 'KDNA_TEST_PROTECTED_ASSET']),
    command: Object.freeze(['scripts/test-templates.js']),
    // The coverage this leg keeps even when it is held at not_run: the packed-CLI
    // generation, install, product test and build of every template, plus the browser
    // adoption checks that do not consume a current-contract asset.
    retained_coverage: 'packed CLI generation, install, product test and build for express, nextjs-pages and nextjs, plus the express and nextjs-pages Chromium adoption checks',
    not_covered: 'the current basic template (nextjs) Chromium adoption check, which consumes the current-contract asset',
  },
});

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function fail(message) {
  throw new Error(`ci leg registry: ${message}`);
}

function loadLegRegistry(root) {
  let registry;
  try {
    registry = readJson(path.join(root, REGISTRY_PATH));
  } catch (error) {
    fail(`cannot read ${REGISTRY_PATH}: ${error.message}`);
  }
  if (registry?.format !== 'kdna.ci-leg-registry/1') {
    fail(`${REGISTRY_PATH} format must be kdna.ci-leg-registry/1`);
  }
  if (typeof registry.purpose !== 'string' || registry.purpose.length < 64) {
    fail(`${REGISTRY_PATH} must state its purpose in plain language`);
  }
  if (!Array.isArray(registry.entries)) fail(`${REGISTRY_PATH} entries must be an array`);
  const seen = new Set();
  for (const entry of registry.entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      fail(`${REGISTRY_PATH} entries must be JSON objects`);
    }
    if (!Object.hasOwn(LEGS, entry.leg)) fail(`registration for unknown leg ${String(entry.leg)}`);
    if (entry.class !== 'not_run') fail(`entry ${entry.leg} class must be not_run`);
    if (typeof entry.reason !== 'string' || entry.reason.length < 16) {
      fail(`entry ${entry.leg} must state a reason`);
    }
    if (entry.object !== LEGS[entry.leg].object) {
      fail(`entry ${entry.leg} object must equal the leg definition's object`);
    }
    if (!Array.isArray(entry.unavailable_codes) || entry.unavailable_codes.length === 0) {
      fail(`entry ${entry.leg} must name the unavailability codes it registers`);
    }
    if (typeof entry.basis !== 'string' || entry.basis.length < 64) {
      fail(`entry ${entry.leg} must state the evidence basis of the unavailability`);
    }
    if (typeof entry.trigger !== 'string' || entry.trigger.length < 64) {
      fail(`entry ${entry.leg} must state the trigger that removes the registration`);
    }
    if (typeof entry.owner !== 'string' || entry.owner.trim() === '') {
      fail(`entry ${entry.leg} must name an owner`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(entry.review_by ?? '')) {
      fail(`entry ${entry.leg} must carry a review_by expiry date`);
    }
    if (seen.has(entry.leg)) fail(`${REGISTRY_PATH} registers a leg twice`);
    seen.add(entry.leg);
  }
  return registry;
}

function registrationFor(registry, leg) {
  return (registry.entries ?? []).find((entry) => entry.leg === leg);
}

function entryExpired(registration, today = new Date().toISOString().slice(0, 10)) {
  return Boolean(registration) && registration.review_by < today;
}

// Code 1: the committed current basic template binds the component-semantics Core
// contract, so a pre-component-semantics public reference asset cannot drive its
// adoption leg. Read from the committed manifests, not from a gate constant.
function templatesBindCurrentContract(root) {
  const coordinates = [];
  for (const relative of CURRENT_TEMPLATE_MANIFESTS) {
    const manifest = readJson(path.join(root, relative));
    const coordinate = manifest?.dependencies?.['@aikdna/kdna-core']
      ?? manifest?.devDependencies?.['@aikdna/kdna-core'];
    if (typeof coordinate !== 'string' || !coordinate.includes(CURRENT_CONTRACT_MARKER)) {
      return { holds: false, detail: { [relative]: coordinate ?? null } };
    }
    coordinates.push(`${relative}=${coordinate}`);
  }
  return { holds: true, detail: coordinates };
}

// Code 2: no authorized current-contract asset is supplied. Read from the environment the
// job actually runs with and from the committed workflow, so the code cannot be self
// manufactured by the gate and disappears the moment the job supplies the asset.
function currentContractAssetNotSupplied(root, environment) {
  const supplied = ['KDNA_TEST_CURRENT_ASSET', 'KDNA_TEST_CURRENT_JUDGMENT_ID']
    .filter((name) => typeof environment[name] === 'string' && environment[name].trim() !== '');
  const workflow = fs.readFileSync(path.join(root, WORKFLOW_PATH), 'utf8');
  const workflowNamesTheAsset = workflow.split('\n').some((line) => (
    /KDNA_TEST_CURRENT_ASSET\s*:/u.test(line) || /KDNA_TEST_CURRENT_JUDGMENT_ID\s*:/u.test(line)
  ));
  const detail = [];
  if (supplied.length > 0) detail.push(`supplied_in_environment=${supplied.join(',')}`);
  if (workflowNamesTheAsset) detail.push(`workflow_names_the_asset=${WORKFLOW_PATH}`);
  return { holds: supplied.length === 0 && !workflowNamesTheAsset, detail };
}

/** Recompute, from the committed bytes alone, the unavailability codes of one leg. */
function unavailabilityCodes(root, environment = process.env) {
  const codes = [];
  const detail = {};
  const contract = templatesBindCurrentContract(root);
  if (contract.holds) {
    codes.push(CODE_TEMPLATES_BIND_CURRENT_CONTRACT);
    detail[CODE_TEMPLATES_BIND_CURRENT_CONTRACT] = contract.detail;
  }
  const supplied = currentContractAssetNotSupplied(root, environment);
  if (supplied.holds) {
    codes.push(CODE_CURRENT_CONTRACT_ASSET_NOT_SUPPLIED);
    detail[CODE_CURRENT_CONTRACT_ASSET_NOT_SUPPLIED] = supplied.detail;
  }
  return { codes: [...new Set(codes)].sort(), detail };
}

function sameCodeSet(left, right) {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return a.length === b.length && a.every((code, index) => code === b[index]);
}

module.exports = {
  ADOPTION_SKIPPED_FLAG,
  CODE_CURRENT_CONTRACT_ASSET_NOT_SUPPLIED,
  CODE_TEMPLATES_BIND_CURRENT_CONTRACT,
  CURRENT_TEMPLATE_MANIFESTS,
  LEGS,
  REGISTRY_PATH,
  WORKFLOW_PATH,
  entryExpired,
  loadLegRegistry,
  registrationFor,
  sameCodeSet,
  unavailabilityCodes,
};
