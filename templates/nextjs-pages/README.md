# KDNA Next.js Pages Router starter

This generated Node.js 22+ application binds KDNA Core 0.21.0, Web Server
0.3.1, and React 0.4.0. The browser uploads a selected `.kdna` file; the server
then performs inspect, LoadPlan evaluation, authorization, and Runtime Capsule
projection.

```bash
cp .env.local.example .env.local
npm test
npm run dev
```

Open `http://localhost:3000` and choose a `.kdna` file. Storage and activation
configuration are documented in `.env.local.example`. Do not log or persist
passwords, license keys, signed entitlements, or server error internals.
