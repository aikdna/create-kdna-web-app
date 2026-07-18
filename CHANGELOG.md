# Changelog

## 0.4.0 (2026-07-18)

- Bind generated apps to KDNA Core 0.20.0, Web Server 0.3.0, React 0.3.0,
  and Node.js 20 or later.
- Make all three browser demos execute inspect -> plan-load -> load and render
  structured Runtime Capsule context without direct React object children.
- Replace import-only template acceptance with packed-CLI cold generation,
  clean installs, actual production servers, HTTP route evidence, and Chromium.
- Restrict npm publication to exact stable GitHub releases checked out by tag,
  with immutable CI actions, exact HEAD and main-ancestry checks, unique registry
  coordinates, CodeQL, and provenance.
- Ship the complete Apache-2.0 license text and verify it in source and packed
  package public-surface gates.
- Verify public and password-protected assets through all three generated
  production applications, including Express password unlock and accurate
  post-unlock status in both React templates.
- Verify packed-CLI installation and production builds with npm, pnpm 11.14.0,
  and Yarn 1.22.22; enforce DCO on every pull request commit.

## 0.3.1 (2026-07-14)

- Scaffold KDNA Core 0.17.0 and Web Server 0.2.3.
- Keep KDNA Core outside the Next.js App Router Turbopack server bundle so a
  generated application completes a production build and runs through Node.js.
- Add clean generated-template install, smoke, and production-build release
  gates for Express, Next.js Pages Router, and Next.js App Router.

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
