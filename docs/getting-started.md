# Getting started

Use the approved local 0.6.0 candidate CLI for current basic App Router + npm:

```bash
create-kdna-web-app my-app --package-manager npm
cd my-app
npm test
npm run build
npm start
```

Open http://127.0.0.1:3210. Select an authorized current `.kdna` file, then
choose Read. Selection is local; the explicit request renders the official
public ViewModel. Cancel/Release/replacement suppress late results. Expand is
unsupported and no local action capability is granted.

If generation used `--no-install`, run `npm run setup` first. This one command
installs both application and independent Host from their locks with
`--ignore-scripts`; no second undocumented install is needed. With all locked
registry tarballs preseeded, `npm_config_offline=true npm run setup` stays offline.
Use `npm run dev` for development. Both local child processes are owned by the
launcher. See the generated README for ports, policy limits and exact archives.

The current template does not configure password/activation or migrate old
assets. A local file alone is not consent to process it. pnpm/Yarn, Pages and
Express are retained historical surfaces, not upgraded or retested here.

## Historical template example

For the unchanged Pages/Express templates only, the previous example recipe is:

```bash
npm install -g @aikdna/kdna-cli@0.36.1
kdna demo judgment ./demo-judgment
kdna pack ./demo-judgment ./demo-judgment.kdna
```

Those templates retain their old inspect/LoadPlan/load and storage/activation
behavior. Do not apply that history as acceptance of current basic Read.

See [templates](templates.md) and [checklist](template-checklist.md).
