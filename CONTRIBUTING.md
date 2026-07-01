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
   - `npm test` passes
   - `node bin/create-kdna-web-app.js test-output --template <name>` succeeds
   - Generated project starts with `npm run dev` and the health endpoint returns 200

## Developer Certificate of Origin (DCO)

All commits must include a `Signed-off-by:` line.
Use `git commit -s` to add it automatically. No CLA is required.

## Template Guidelines

Each template must:

1. Include `@aikdna/kdna-web-server`, `@aikdna/kdna-web-client`, and
   `@aikdna/kdna-react` as dependencies.
2. Implement the complete validate → plan-load → load → display flow
   out of the box.
3. Include a `README.md` explaining what the template does and how to
   configure the activation server URL and storage paths.
4. Pass the generated-project checklist in `docs/template-checklist.md`.

Security constraints from `@aikdna/kdna-web-server/CONTRIBUTING.md`
apply to all templates without exception.
