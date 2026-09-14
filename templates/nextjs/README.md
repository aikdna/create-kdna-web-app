# {{projectName}}

Current basic Next.js App Router + npm starter. This template uses explicit
public Read and a separate loopback Host. It does not automatically upload or
load a selected file. The bundled KDNA archives are exact local candidates,
not a claim that these package versions have been published.

## Install and run

The scaffolder installs both lockfiles by default. If generated with
`--no-install`, run the same complete setup explicitly:

```bash
npm run setup
npm test
npm run build
npm start
```

Open http://127.0.0.1:3210. For development use `npm run dev`. The launcher owns
the application and Host and closes both on termination; choose other loopback
ports with `npm start -- --port 3210 --host-port 3211`.

`setup` runs `npm ci --ignore-scripts --no-audit --no-fund` separately in this
directory and `host/`, stops on failure, and does not run dependency hooks.

### Offline install boundary

This template vendors the KDNA packages only. `npm ci --offline` with an empty
npm cache fails in this directory at the first missing package (`tslib`): it
resolves 75 registry packages (Next/React and their graph), and an installed tree
is about 219 MiB. Use registry access or a prepared npm cache here. The `host/`
subdirectory is fully vendored and installs with an empty cache
(`npm ci --offline`, 12 packages). Not redistributing the framework tarballs is a
deliberate size choice, not a defect.
To use a preseeded npm cache without network, run
`npm_config_offline=true npm run setup`. The exact registry tarballs must be
present in that cache. No global CLI or additional hidden Host install is needed.
The npm lockfiles are authoritative for this starter. pnpm and Yarn are not
upgraded or verified for the current basic template; the retained pnpm metadata
is historical and is not a current install recipe.

## Use a file

Select an explicitly authorized `.kdna` file, then choose Read. Selection stays
local to the browser. Read requests one literal judgment ID through the public
React/Client APIs. Cancel aborts a pending read; Release clears the selection
and result; replacing the selection suppresses old late responses. Render only
the official public ViewModel. Text stays literal and bounded.

This local operator example allows its configured basic policy; it is not a
production user-authentication provider. Denial and transport responses do not
disclose content. The response grants no local action capability. Cross-request
expand, protected/remote delivery, full-platform behavior, strict React 19
declaration compilation, real-human acceptance and production security are not
established by this template.

## Two dependency graphs

The application and Host install the same accepted Core archive into two
independent graphs and lockfiles. They intersect only through bounded loopback
HTTP. Do not hoist, deduplicate, or move Host dependencies into the application
graph, and keep both installs separate.

| Graph | Archive | SHA-256 |
| --- | --- | --- |
| app | Core 0.24.0-rc.component-semantics.2 | a9cb3f08735b00657e4848766f0ac517abdcb256121a841f01e662525a0858ea |
| app | Read 0.3.0-rc.component-semantics.2 | 43d0f12a1a63a88d26570bfff821919a5cd478fdbd0568bd9c819bc56078b0f0 |
| app | Client 0.5.0-rc.component-semantics.1 | 1a9d90fbdfab35b249da0db16fe7c1099a1b2c3443c02b737461416397367658 |
| app | React 0.6.0-rc.component-semantics.1 | 388f182f81dc26e84e4ff6988ff456cdabc5e9fcee20d55b01e4d8996024bcf4 |
| host | Core 0.24.0-rc.component-semantics.2 | a9cb3f08735b00657e4848766f0ac517abdcb256121a841f01e662525a0858ea |
| host | Read 0.3.0-rc.component-semantics.2 | 43d0f12a1a63a88d26570bfff821919a5cd478fdbd0568bd9c819bc56078b0f0 |
| host | Host 0.5.0-rc.component-semantics.1 | 4057a84b76d173470c59f95dc0e73af81aa21d36876f6daf4226c1ceaefc7551 |

The app uses Next 16.3.5 and React 19.2.7. All seven KDNA archive placements
are shipped in `vendor/` and `host/vendor/`; registry dependencies remain
locked. The example environment file describes bounded local policy test
settings. Do not put credentials or material into public logs or source control.
