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

`KDNA_STORAGE_DIR` is optional; set it when you want a stable upload directory
instead of the operating-system temporary directory:

```bash
KDNA_STORAGE_DIR=/tmp/kdna
```

`KDNA_ACTIVATION_URL` is optional. Leave it empty unless you are working
with licensed-mode assets and have a self-hosted activation server.

---

## Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Try it with a real .kdna file

Install the KDNA CLI and generate a current example asset:

```bash
npm install -g @aikdna/kdna-cli@0.35.1
kdna demo judgment ./demo-judgment
kdna pack ./demo-judgment ./demo-judgment.kdna
```

Drop the file onto the page. You should see:

1. The manifest metadata (domain, version, title).
2. The LoadPlan state produced before loading.
3. The formatted Runtime Capsule context after a public asset loads.

The browser demo does not parse the container. The selected file is uploaded
to Web Server 0.3.0, and KDNA Core 0.20.0 performs validation, planning,
authorization, and projection on the server.

---

## Next steps

- [Templates](./templates.md) — switch to Express or Pages Router
- [KDNA Core](https://github.com/aikdna/kdna) — understand the file format
- [kdna-web-server docs](https://github.com/aikdna/kdna-web-server) — add auth middleware, configure storage
- [kdna-react docs](https://github.com/aikdna/kdna-react) — customise the components
