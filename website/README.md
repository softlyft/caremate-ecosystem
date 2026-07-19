# CareMate website

Marketing site for CareMate — welcome page, patient guide, provider marketing + guide, privacy, and terms.

## Pages

| Path | Purpose |
|------|---------|
| `/` | Patient-facing welcome + CareMate for providers section |
| `/guide` | Patient guide |
| `/providers` | Provider marketing (portal positioning) |
| `/providers/guide` | Provider guide (claim, connections, engagement tools) |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |

## Develop

From the monorepo root:

```bash
npm install
npm run website:dev
```

Opens Vite on [http://localhost:5175](http://localhost:5175).

## Build

```bash
npm run website:build
```

## Brand

Uses CareMate mobile assets (`caremate-logo-header`, splash icon, homepage screenshot) and theme tokens from `caremate/src/theme/colors.ts` (teal primary `#0D9488`, surface `#F8FAFC`, etc.).

Provider copy aligns with [`caremate-provider-portal/docs`](../caremate-provider-portal/docs/README.md).

Legal pages are intended for production hosting (e.g. `https://caremate.app/privacy` and `/terms`). Align mobile `LEGAL_URLS` when the domain is live.
