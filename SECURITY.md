# Security Policy

## Reporting a Vulnerability

Please **do not** report security vulnerabilities through public GitHub issues.

Instead, use one of these private channels:

- **GitHub Private Vulnerability Reporting**: Go to the [Security Advisories](https://github.com/aikdna/create-kdna-web-app/security/advisories/new) page
- **Email**: security@aikdna.com

We aim to respond within 72 hours and provide a timeline for resolution within 1 week.
Please do not disclose the vulnerability publicly until we have had a chance to address it.

## Supported Versions

The historical 0.5.0 scaffold binds Core 0.21.0 / Web Server 0.3.1 / React 0.4.0.
The unpublished 0.6.0 candidate upgrades only basic App Router + npm, with exact
application Core 0.24.0-rc.component-semantics.2 / Read 0.3.0-rc.component-semantics.2 /
Client 0.5.0-rc.component-semantics.1 / React 0.6.0-rc.component-semantics.1 and a
separate Host 0.5.0-rc.component-semantics.1 / same accepted Core archive /
Read 0.3.0-rc.component-semantics.2 graph. It does not withdraw the
historical Pages/Express support policy or establish a new stable release.
Older pre-release versions may receive critical security patches case by case.

## Security Model

The current template consumes public Core/Read/Client/React contracts. Selecting
a file stays local; only explicit Read sends it through bounded loopback HTTP.
It renders the official public ViewModel as literal text, never interprets
asset content as action authorization, and suppresses cancelled/released/old
selection results. The operator policy example is not production authentication.
The separate Host graph must not be hoisted into the application graph.

The setup command installs exact locked graphs with dependency scripts disabled.
Current protected/remote flows, cross-request expand, real-human identity,
strict React 19 declaration compile and full-platform security are not proved.
Legacy Pages/Express retain their historical password/license model; those
inputs must not be logged, persisted or reflected, and license keys belong at
activation endpoints, not load. No secret provider is added by this candidate.

Report vulnerabilities through the channels above. Canonical protocol security
remains [GOVERNANCE.md](https://github.com/aikdna/kdna/blob/main/docs/GOVERNANCE.md).
