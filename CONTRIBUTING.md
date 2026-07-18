# Contributing to create-kdna-web-app

## Issues

Open an issue at the repository. Include:

- Node.js version (`node --version`)
- npm / pnpm / yarn version
- The exact `create-kdna-web-app` command you ran
- Any error output

If proposing a new template, tag the issue `[RFC]` and describe the
target framework, what makes the setup non-trivial, and who the
audience is.

## Pull Requests

1. Fork and branch from `main`.
2. Keep PRs focused — one logical change per PR.
3. All commits must be signed off: `git commit -s`
4. Title format: `area: what changed` (e.g. `template/nextjs: update to App Router default`)
5. Verify before opening:
   - `npm run ci:static` passes
   - `KDNA_TEST_ASSET=path/to/accepted-asset.kdna npm run test:templates` passes
   - The generated production project completes inspect -> plan-load -> load
     in Chromium, not only an import smoke test

## Developer Certificate of Origin (DCO)

All commits must include a `Signed-off-by:` line.
Use `git commit -s` to add it automatically. No CLA is required.

## Template Guidelines

Each template must:

1. Include only the KDNA packages the template imports at runtime.
   Next.js templates should include `@aikdna/kdna-web-server` and
   `@aikdna/kdna-react`; Express templates should include
   `@aikdna/kdna-web-server`.
2. Implement the complete inspect → plan-load → load → display flow
   out of the box.
3. Include a `README.md` explaining what the template does and how to
   configure the activation server URL and storage paths.
4. Pass the generated-project checklist in `docs/template-checklist.md`.

Security constraints from `@aikdna/kdna-web-server/CONTRIBUTING.md`
apply to all templates without exception.

The browser gate uses Playwright 1.61.1 and Chromium. Install the browser once
before running the full gate:

```bash
npx playwright install chromium
```
