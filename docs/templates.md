# Templates

`create-kdna-web-app` ships three templates. Choose with `--template`.

---

## `nextjs` (default)

Current basic App Router + npm, delivered as an unpublished local candidate.
Its application and separate loopback Host use two exact lockfiles and seven
bundled KDNA archives. `npm run setup` installs both with hooks disabled.
Selection stays local; explicit Read renders the official public ViewModel.
Cancel, Release and replacement suppress late responses. Expand is unsupported.

```bash
create-kdna-web-app my-app --template nextjs --package-manager npm
cd my-app && npm run build && npm start
# http://127.0.0.1:3210
```

`--no-install` copies only files; then use `npm run setup`. pnpm/Yarn are not
upgraded or verified for this current template. See its README for exact pins.

## Legacy scope

The following Pages/Express descriptions and commands document retained
historical support; they are not current basic upgrades or new acceptance.

## `nextjs-pages`

**When to use:** You are integrating into an existing Next.js Pages
Router project, or prefer the Pages Router.

**Framework:** Next.js (Pages Router)

**What it includes:**

| File | Purpose |
|------|---------|
| `pages/api/kdna/[...route].js` | All KDNA endpoints |
| `pages/index.jsx` | Demo page with the same complete Runtime Capsule flow |
| `.env.local.example` | Environment variable template |

**Start:**

```bash
npx create-kdna-web-app my-app --template nextjs-pages
cd my-app && npm run dev
```

---

## `express`

**When to use:** You need a standalone Node.js server, are not using
Next.js, or are integrating into an existing Express application.

**Framework:** Express (ESM)

**What it includes:**

| File | Purpose |
|------|---------|
| `src/server.js` | Express server with KDNA router at `/api/kdna` |
| `public/index.html` | Static demo with explicit inspect, plan-load, and load calls |
| `.env.example` | Environment variable template |

**Start:**

```bash
npx create-kdna-web-app my-app --template express
cd my-app && npm start
# Open http://localhost:3000
```

---

## Choosing a template

| | `nextjs` | `nextjs-pages` | `express` |
|-|----------|----------------|-----------|
| KDNA API route included | Yes | Yes | Yes |
| Edge runtime | No | No | No |
| Browser demo included | React page | React page | Static HTML |
| React dependency included | Yes | Yes | No |

Web Server 0.3.0 is verified on Node.js runtimes. These templates do not claim
an Edge or Worker adapter.
