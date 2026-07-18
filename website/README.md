# CareMate website

Marketing site for CareMate — welcome page, privacy policy, and terms of service.

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

Legal pages are intended for production hosting (e.g. `https://caremate.app/privacy` and `/terms`). Align mobile `LEGAL_URLS` when the domain is live.
