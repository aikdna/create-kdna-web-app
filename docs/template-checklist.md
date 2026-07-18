# Template checklist

Use this checklist when adding or changing a `create-kdna-web-app`
template.

## Required files

- `package.json` with bounded dependency ranges, never `latest`.
- KDNA server route or server entrypoint.
- Browser demo page that exercises inspect, plan-load, and load.
- Environment example file for storage and activation settings.
- `scripts/smoke.mjs` that imports the KDNA package entrypoints used by
  the generated project.
- A generated-project `README.md` that names the exact KDNA coordinates and
  the inspect -> LoadPlan -> load boundary.

## Runtime boundaries

- KDNA assets stay server-side after upload.
- Decryption and license verification happen through
  `@aikdna/kdna-web-server` or a compatible server API.
- Raw license keys go to activation endpoints, not `/load`.
- Remote-server configuration is not included until the server adapter
  implements and documents that mode.

## Verification

- `npm run ci:static` passes in this repository.
- A generated project includes the expected route, page, env example, and
  smoke script.
- The generated template package uses bounded dependency ranges.
- Public docs and package metadata mention only templates that exist.
- The packed CLI cold-generates all three templates; each clean install starts
  its real production server and completes inspect -> plan-load -> load in
  Chromium with both an accepted public asset and the pinned Core password
  test vector.
- The advertised npm, pnpm, and Yarn paths execute a real packed-CLI install;
  the reference non-npm versions also complete a Next.js production build.
- Browser output contains structured Runtime Capsule context, never
  `[object Object]` or a server filesystem path.
