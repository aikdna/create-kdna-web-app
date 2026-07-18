# Security Policy

## Reporting a Vulnerability

Please **do not** report security vulnerabilities through public GitHub issues.

Instead, use one of these private channels:

- **GitHub Private Vulnerability Reporting**: Go to the [Security Advisories](https://github.com/aikdna/create-kdna-web-app/security/advisories/new) page
- **Email**: security@aikdna.com

We aim to respond within 72 hours and provide a timeline for resolution within 1 week.
Please do not disclose the vulnerability publicly until we have had a chance to address it.

## Supported Versions

`create-kdna-web-app` is a pre-release scaffolder support surface. Until the
first stable package release, security support tracks the latest mainline
pre-release and the canonical KDNA protocol/runtime surfaces.

| Component | Supported Versions |
|-----------|-------------------|
| KDNA Core | 0.20.0 |
| KDNA Web Server | 0.3.0 |
| KDNA React | 0.3.0 |
| create-kdna-web-app | 0.4.0 |

Older pre-release versions may receive critical security patches on a
case-by-case basis.

## Security Model

`create-kdna-web-app` scaffolds KDNA-integrated web applications. Generated
templates must consume the public KDNA package contracts rather than define
protocol validity, access modes, LoadPlan states, or crypto policy.

The selected `.kdna` file exists briefly in browser memory while it is
uploaded. Validation, authorization, decryption, profile selection, and
Runtime Capsule projection happen on the server. Password and license inputs
may exist briefly in browser form state; generated code must not log, persist,
or reflect them. Raw license keys go to `/activate`, not `/load`.

For the KDNA Protocol security architecture, see
[GOVERNANCE.md](https://github.com/aikdna/kdna/blob/main/docs/GOVERNANCE.md)
in the main protocol repository.
