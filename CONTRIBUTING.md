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
   - `npm run test:templates` passes with the three explicit current and
     historical asset inputs documented in README
   - The current App Router project completes explicit selection and Read
     through its separate Host in Chromium
   - Historical Pages/Express projects retain their separately bound
     inspect -> plan-load -> load checks

## Developer Certificate of Origin (DCO)

All commits must include a `Signed-off-by:` line.
Use `git commit -s` to add it automatically. No CLA is required.

## Template Guidelines

Each template must preserve its declared dependency and capability boundary:

1. Include only the KDNA packages its runtime imports. Keep the current App
   Router application and loopback Host in separate dependency graphs; Host
   packages do not belong in the browser graph.
2. The current App Router starter selects locally and sends an explicit Read,
   then displays the bounded public ViewModel. It has no Plan or load flow.
3. Include a `README.md` describing the exact setup, proof limits and policy
   boundary. The current operator policy example is not authentication.
4. Pass the generated-project checklist in `docs/template-checklist.md`.

Historical Pages/Express templates keep their original bindings and documented
inspect/plan-load/load, activation and storage contract. Do not apply those
instructions to the current App Router starter. The matching version's Web
Server security constraints apply to each graph; preserve the separate
historical checks and support policy.

The browser gate uses Playwright 1.61.1 and Chromium. Install the browser once
before running the full gate:

```bash
npx playwright install chromium
```
