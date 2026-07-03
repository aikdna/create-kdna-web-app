# create-kdna-web-app

**Scaffold a KDNA-integrated web application in one command.**

```bash
npx create-kdna-web-app my-app
cd my-app
npm run dev
```

The Next.js templates include `@aikdna/kdna-web-server` and
`@aikdna/kdna-react` pre-configured with a validate -> inspect ->
plan-load -> load demo. The Express template includes the server adapter
and a minimal static HTML demo.

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
- `public/index.html` — minimal HTML demo page
- `.env.example` for local configuration

---

## Template dependencies

| Template | KDNA packages |
|----------|---------------|
| `nextjs` | `@aikdna/kdna-core`, `@aikdna/kdna-web-server`, `@aikdna/kdna-react` |
| `nextjs-pages` | `@aikdna/kdna-core`, `@aikdna/kdna-web-server`, `@aikdna/kdna-react` |
| `express` | `@aikdna/kdna-core`, `@aikdna/kdna-web-server` |

## Pre-configured flow

The Next.js templates provide the full React flow:

1. User drops a `.kdna` file onto the `<KDNAFileDropzone>`.
2. The file is uploaded and inspected — metadata appears immediately.
3. `<KDNALoadPlanGate>` checks whether a password or license is needed.
4. If the asset is open, it loads automatically.
5. If the asset requires a password, `<KDNAPasswordUnlockDialog>` appears.
6. The loaded content is displayed.

The Express template mounts the same `/api/kdna` server endpoints and includes
a minimal HTML page that uploads, inspects, and loads an open `.kdna` asset.

### Environment variables

```bash
# Optional
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
npm test                           # smoke-test KDNA package imports
npm run dev
# Open http://localhost:3000 and drop a .kdna file
```

To get a `.kdna` file for testing:

```bash
npm install -g @aikdna/kdna-cli
curl -LO https://github.com/aikdna/kdna-assets/releases/download/agent-project-context-v0.1.2/agent-project-context-v0.1.2.kdna
```

---

## Related packages

| Package | Role |
|---------|------|
| [`@aikdna/kdna-core`](https://github.com/aikdna/kdna) | KDNA format and runtime |
| [`@aikdna/kdna-web-server`](https://github.com/aikdna/kdna-web-server) | Server-side adapter |
| [`@aikdna/kdna-react`](https://github.com/aikdna/kdna-react) | React components and hooks |

---

## License

Apache 2.0 — see [LICENSE](./LICENSE).
