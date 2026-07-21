# create-kdna-web-app

**Scaffold a KDNA-integrated web application in one command.**

> **Status:** Experimental published scaffolder at its exact package
> coordinate. The generated file-drop flow is technical integration evidence,
> not current Host-experience acceptance or a hosted KDNA platform.

```bash
npx create-kdna-web-app my-app
cd my-app
npm run dev
```

Node.js 20 or later is required. Every template binds KDNA Core 0.20.0 and
Web Server 0.3.0. The Next.js templates additionally bind React 0.3.0.
Generated apps execute the same inspect -> LoadPlan -> load -> Runtime Capsule
flow; they do not decode `.kdna` containers directly.

[![npm](https://img.shields.io/npm/v/create-kdna-web-app)](https://www.npmjs.com/package/create-kdna-web-app)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

---

## Usage

```bash
npx create-kdna-web-app <project-name> [options]
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--template` | `nextjs` | Project template — see [templates](#templates) |
| `--package-manager` | auto-detected | `npm`, `pnpm`, or `yarn` |
| `--no-install` | — | Scaffold files without running install |

The release gate verifies npm across all three templates. It also runs the
packed scaffolder's real install and Next.js production build with pnpm 11.14.0 and
Yarn 1.22.22, so the advertised package-manager paths are executable rather
than parser-only options.

### Examples

```bash
# Next.js App Router (default)
npx create-kdna-web-app my-app

# Express
npx create-kdna-web-app my-app --template express

# Next.js Pages Router
npx create-kdna-web-app my-app --template nextjs-pages
```

---

## Templates

### `nextjs` (default)

- Next.js 16+ with App Router
- `app/api/kdna/[...route]/route.js` — all KDNA endpoints mounted
- `app/page.jsx` — full demo: file drop, inspect, load, display
- `.env.local.example` for local configuration

### `nextjs-pages`

- Next.js with Pages Router
- `pages/api/kdna/[...route].js` — all KDNA endpoints
- `pages/index.jsx` — same demo as the App Router template

### `express`

- Express with ESM
- `src/server.js` — KDNA router mounted at `/api/kdna`
- `public/index.html` — browser demo with the complete LoadPlan flow
- `.env.example` for local configuration

---

## Template dependencies

| Template | KDNA packages |
|----------|---------------|
| `nextjs` | Core 0.20.0, Web Server 0.3.0, React 0.3.0 |
| `nextjs-pages` | Core 0.20.0, Web Server 0.3.0, React 0.3.0 |
| `express` | Core 0.20.0, Web Server 0.3.0 |

## Pre-configured flow

The Next.js templates provide the published experimental React integration flow:

1. User drops a `.kdna` file onto the `<KDNAFileDropzone>`.
2. The file is uploaded and inspected — metadata appears immediately.
3. `<KDNALoadPlanGate>` checks whether a password or license is needed.
4. If the asset is public, it loads automatically.
5. If the asset requires a password, `<KDNAPasswordUnlockDialog>` appears.
6. The loaded content is displayed.

The Express template mounts the same `/api/kdna` server endpoints and includes
a static page that explicitly calls inspect, plan-load, and load in order.
All templates render projected objects with `JSON.stringify`; React objects are
never passed directly as JSX children.

The user explicitly selecting and dropping a file is the authority boundary for
this demo flow. A product that remembers an attachment must additionally keep
its exact identity, digest, scope, and reason visible and provide
disable/switch/rollback controls. Saving an upload does not create broader task
authority.

### Environment variables

```bash
# Optional; the server uses an OS temporary directory when omitted
KDNA_STORAGE_DIR=/tmp/kdna

# Optional — only needed for licensed-mode assets
KDNA_ACTIVATION_URL=https://your-activation-server.example.com
```

---

## After scaffolding

```bash
cd my-app
cp .env.local.example .env.local   # Next.js templates
# or: cp .env.example .env         # Express template, if you load env files locally
npm test                           # smoke-test exact package entrypoints
npm run dev
# Open http://localhost:3000 and drop a .kdna file
```

To get a `.kdna` file for testing:

```bash
npm install -g @aikdna/kdna-cli@0.35.0
kdna demo judgment ./demo-judgment
kdna pack ./demo-judgment ./demo-judgment.kdna
```

---

## Related packages

| Package | Role |
|---------|------|
| [`@aikdna/kdna-core`](https://github.com/aikdna/kdna) | KDNA format and runtime |
| [`@aikdna/kdna-web-server`](https://github.com/aikdna/kdna-web-server) | Server-side adapter |
| [`@aikdna/kdna-react`](https://github.com/aikdna/kdna-react) | React components and hooks |

## What this release verifies

The scaffolder release gate packs the CLI, generates each template from that
archive into an empty directory, performs a clean install, starts the actual
production server, and uses Chromium with the published Laozi reference asset to
observe successful `/inspect`, `/plan-load`, and `/load` responses. A template
is not accepted by import-only smoke tests.

---

## License

Apache 2.0 — see [LICENSE](./LICENSE).
