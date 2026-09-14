# create-kdna-web-app

**Scaffold a KDNA-integrated web application.**

Version 0.6.0 is an unpublished local candidate. Its current basic surface is
Next.js App Router + npm. Pages Router, Express and the historical pnpm/Yarn
paths remain in the repository at their previous bindings; they are not
upgraded or newly verified by this candidate. Existing publication and release
policies remain in force. A package version or successful generation is not
independent acceptance or a publication grant.

## Current basic starter

Use the explicitly approved local source or packed `create-kdna-web-app` CLI:

```bash
create-kdna-web-app my-app --template nextjs --package-manager npm
cd my-app
npm test
npm run build
npm start
```

Node.js 22 or later is required. Open http://127.0.0.1:3210. `npm run dev` starts
the development application with its separate loopback Host. The launcher owns
both child processes and closes them when stopped.

Generation installs the application and `host/` from their separate lockfiles
using npm ci with dependency scripts disabled. For generation without any install:

```bash
create-kdna-web-app my-app --no-install
cd my-app
npm run setup
```

That public setup command performs both installs. `npm install` at the root
alone is not the complete setup. To use a fully seeded offline cache, set
`npm_config_offline=true` on generation or setup. No private checkout or global
KDNA installation is required by the generated code; the seven fixed KDNA
archives ship with the template. Registry dependencies must be available.

### Options

| Flag | Default | Meaning |
| --- | --- | --- |
| `--template` | `nextjs` | `nextjs`, `nextjs-pages`, or `express` |
| `--package-manager` | detected | npm for current basic; legacy managers remain for older templates |
| `--no-install` | false | Copy files only; never run an installer |
| `--help` | | Show usage without writing |

Current basic installation with pnpm/Yarn fails before creating a project and
explains the npm requirement. `--no-install` remains generation-only. Target
directories must be empty, have safe package names, and contain no symlink path
components. Binary archives and exact file modes are preserved.

| Current App Router operation | npm | pnpm 11.14.0 / Yarn 1.22.22 |
| --- | --- | --- |
| Generate with `--no-install` | Supported | Supported; output retains npm lockfiles |
| Generate and install | Supported, including the separate Host | Rejected before creating files |
| Install an existing generated project | `npm run setup` | Unsupported |

The two package-manager CI checks verify packed-CLI generation and the explicit
installation refusal, including both npm dependency graphs. Their passing status
does not mean pnpm or Yarn installation is supported. Generated application build
and browser behavior are checked separately through the npm template workflow.

## Current selection and Read boundary

1. Select an explicitly authorized file; selection alone sends no HTTP.
2. Choose Read for a literal judgment ID.
3. The official React/Client APIs request bounded basic Read from the Host.
4. Display only the official public ViewModel, with literal bounded text.
5. Cancel, replace or Release to stop pending work and suppress late results.

No automatic load or LoadPlan flow remains in the current App Router template.
The local operator policy example is not a production identity provider.
The response grants no local action capability. Cross-request expand is
unsupported; full-platform behavior, strict React 19 declaration compile,
real-human acceptance and production security remain unproved.

### Exact graphs

| Surface | Dependencies |
| --- | --- |
| current app | Core 0.24.0-rc.component-semantics.2 / Read 0.3.0-rc.component-semantics.2 / Client 0.5.0-rc.component-semantics.1 / React 0.6.0-rc.component-semantics.1; Next 16.2.12 / React 19.2.7 |
| current loopback Host | Host 0.5.0-rc.component-semantics.1 / same accepted Core 0.24.0-rc.component-semantics.2 archive / Read 0.3.0-rc.component-semantics.2 |
| legacy Pages | Core 0.21.0 / Web Server 0.3.1 / React 0.4.0 |
| legacy Express | Core 0.21.0 / Web Server 0.3.1 |

Current KDNA archives use exact local `file:vendor` bindings. Full SHA-256 values
and the isolation boundary are in the generated README. The app and Host bind
the same accepted Core archive through separate installs and lockfiles; they
must not be hoisted into one graph.

## Legacy templates and historical checks

`--template nextjs-pages` and `--template express` still generate their original
templates. Their historical inspect -> LoadPlan -> load, password, activation,
storage and package-manager support has not been upgraded to the current basic
contract. The previous release gates covered npm across all three templates
and pnpm 11.14.0 / Yarn 1.22.22. Those source gates and history are retained;
their existence is not a claim that this candidate reran them or all CI passed.

For those historical templates only, the previous local example recipe remains:

```bash
npm install -g @aikdna/kdna-cli@0.36.1
kdna demo judgment ./demo-judgment
kdna pack ./demo-judgment ./demo-judgment.kdna
```

For the current template select a file authorized for the current public
contract; do not convert a legacy asset or infer permission from its presence.

## Verification and references

`npm test`, `npm run lint`, `npm run check:basic` and `npm run package:check`
cover generator/static/package boundaries. Actual generated source and packed
consumers additionally need fresh dual installs, production build, real HTTP,
browser Read and resource closure. None alone signs independent acceptance.
Network/Git-dependent legacy release gates are separate obligations; no shim
or newly initialized Git repository substitutes for them.

`npm run test:templates` is the packed-CLI production adoption gate: it packs
this repository, generates each template, installs the generated lockfiles,
builds both Next.js templates and drives real Chromium against the generated
servers. It takes three explicit inputs: `KDNA_TEST_ASSET` (the published
reference used by the Pages and Express flows), `KDNA_TEST_PROTECTED_ASSET`
(the pinned Core password test vector) and `KDNA_TEST_CURRENT_ASSET` together
with `KDNA_TEST_CURRENT_JUDGMENT_ID` (an authorized component-semantics asset
and one judgment id that asset discloses). The two legacy templates execute
inspect -> plan-load -> load; the current App Router template executes exactly
one explicit Read, keeps inspect, plan-load and load at 501 and rejects GET on
the Read route. The published reference assets predate the component-semantics
contract and are rejected by the current public Core, so the current-template
leg needs an authorized current-contract asset.

See [getting started](docs/getting-started.md), [templates](docs/templates.md),
[checklist](docs/template-checklist.md) and [security policy](SECURITY.md).

## Official packages

Official KDNA packages are published under the `@aikdna` npm scope and the
`aikdna` name on PyPI. The unscoped npm package `kdna` is not affiliated with
the KDNA project. The current bundled local candidates are not claimed published.

## License

Apache 2.0 — see [LICENSE](./LICENSE).
