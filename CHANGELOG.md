# Changelog

## 0.3.0 (2026-07-13)

- Scaffold KDNA Core 0.16.0, React 0.2.0, and Web Server 0.2.2.
- Keep generated applications on the official packaged-asset → LoadPlan →
  Runtime Capsule path with no direct container decoding.

## 0.2.0 (2026-07-13)

- Scaffold Core 0.15.12, React 0.2.0, and Web Server 0.2.0.
- Generate the canonical CLI demo instead of downloading a superseded asset.
- Keep generated loading behind LoadPlan and the server-produced Runtime Capsule.

## 0.1.2 (2026-07-04)

- Bump template dependencies to published KDNA web package versions (`@aikdna/kdna-core` ^0.15.11, `@aikdna/kdna-react` ^0.1.1, `@aikdna/kdna-web-server` ^0.1.1)
- Pin PostCSS `^8.5.10` in Next.js (app router + pages) templates via `overrides` / `pnpm.overrides` / `resolutions` to eliminate the npm audit moderate warning
- Add test asserting the PostCSS pins stay in place

## 0.1.1 (2026-07-03)

- Add missing `app/layout.jsx` to the Next.js app router template
- Normalize `repository.url` metadata for npm
- Add a lightweight lint script to the package CI path
- Add `prepublishOnly` release protection

## 0.1.0 (2026-07-03)

Initial public release of the KDNA web app scaffolder.

- `npx create-kdna-web-app` interactive CLI
- Templates: Next.js app router, Next.js pages router, Express
- Generated projects include KDNA integration boilerplate
- Getting started docs and template checklist
