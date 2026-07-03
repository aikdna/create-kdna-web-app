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

## Runtime boundaries

- KDNA assets stay server-side after upload.
- Decryption and license verification happen through
  `@aikdna/kdna-web-server` or a compatible server API.
- Raw license keys go to activation endpoints, not `/load`.
- Remote-server configuration is not included until the server adapter
  implements and documents that mode.

## Verification

- `npm test` passes in this repository.
- A generated project includes the expected route, page, env example, and
  smoke script.
- The generated template package uses bounded dependency ranges.
- Public docs and package metadata mention only templates that exist.
