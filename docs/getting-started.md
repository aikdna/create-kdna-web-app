# Getting started

This page walks through the first five minutes after running
`npx create-kdna-web-app`.

---

## Create a project

```bash
npx create-kdna-web-app my-app
cd my-app
```

---

## Configure environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local`. The only required variable is `KDNA_STORAGE_DIR`:

```bash
KDNA_STORAGE_DIR=/tmp/kdna
```

The activation and remote server URLs are optional — leave them
empty unless you are working with licensed-mode or remote-mode assets.

---

## Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Try it with a real .kdna file

Install the KDNA CLI and download an example asset:

```bash
npm install -g @aikdna/kdna-cli

curl -LO https://github.com/aikdna/kdna-assets/releases/latest/download/agent-project-context-v0.1.2.kdna
```

Drop the file onto the page. You should see:

1. The manifest metadata (domain, version, title).
2. A "Load" button or automatic loading for open assets.
3. The formatted payload content.

---

## Next steps

- [Templates](./templates.md) — switch to Express or Pages Router
- [KDNA Core](https://github.com/aikdna/kdna) — understand the file format
- [kdna-web-server docs](https://github.com/aikdna/kdna-web-server) — add auth middleware, configure storage
- [kdna-react docs](https://github.com/aikdna/kdna-react) — customise the components
