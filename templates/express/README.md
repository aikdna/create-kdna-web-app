# KDNA Express starter

This generated Node.js 20+ application binds KDNA Core 0.20.0 and Web Server
0.3.0. The static browser page uploads a selected `.kdna` file and explicitly
executes inspect, plan-load, and load before rendering Runtime Capsule context.
If LoadPlan requires a password, the page clears the password field around the
request and renders the authorized Runtime context only after unlock succeeds.

```bash
cp .env.example .env
npm test
npm start
```

Open `http://localhost:3000` and choose a `.kdna` file. The sample server reads
environment variables from its process; use your deployment environment or a
local environment loader if you need `.env` file loading. Do not log or persist
passwords, license keys, signed entitlements, or server error internals.
