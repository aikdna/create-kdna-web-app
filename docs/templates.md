# Templates

`create-kdna-web-app` ships three templates. Choose with `--template`.

---

## `nextjs` (default)

**When to use:** You are starting a new Next.js project or want the
most up-to-date template.

**Framework:** Next.js 16+ (App Router)

**What it includes:**

| File | Purpose |
|------|---------|
| `app/api/kdna/[...route]/route.js` | All KDNA endpoints (catch-all App Router route) |
| `app/page.jsx` | Demo page: file drop, inspect, LoadPlan, load, display |
| `.env.local.example` | Environment variable template |

**Start:**

```bash
npx create-kdna-web-app my-app --template nextjs
cd my-app && npm run dev
```

---

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
