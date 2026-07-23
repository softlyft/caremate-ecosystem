# CareMate website

Marketing site for CareMate — welcome page, patient guide, CareMate Community Network (CCN),
provider marketing + guide, privacy, and terms.

## Pages

| Path | Purpose |
|------|---------|
| `/` | Patient-facing welcome + CareMate for providers section |
| `/guide` | Patient guide |
| `/ccn` | Community Network marketing |
| `/ccn/guide` | Community enrollment + contributor guide |
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

## Deploy (AWS Amplify)

Monorepo Amplify app root: `caremate-website`. Spec: [`amplify.yml`](./amplify.yml).  
Full guide (web apps): [`../docs/amplify-hosting.md`](../docs/amplify-hosting.md).

## Related surfaces

| Surface | URL / package |
|---------|----------------|
| Community Portal join | `https://community.getcaremate.com/join` (prod) / `https://community-dev.getcaremate.com/join` (dev) · [`caremate-community-portal`](../caremate-community-portal/README.md) |
| Mobile Me → Join our movement | Opens `{VITE_SITE_URL}/ccn` via `WEBSITE_URLS.communityNetwork` |
| Provider Portal | [`caremate-provider-portal`](../caremate-provider-portal/README.md) |

## Brand

Uses CareMate mobile assets (`caremate-logo-header`, splash icon, homepage screenshot) and theme tokens from `caremate-mobile/src/theme/colors.ts` (teal primary `#0D9488`, surface `#F8FAFC`, etc.).

Community copy aligns with CareMate Community Handbook / Network Strategy / Growth Playbook themes and [`caremate-community-portal/docs`](../caremate-community-portal/docs/README.md).

Provider copy aligns with [`caremate-provider-portal/docs`](../caremate-provider-portal/docs/README.md).

Legal pages are intended for production hosting (e.g. `https://getcaremate.com/privacy` and `/terms`). Set `VITE_SITE_URL` and `VITE_COMMUNITY_PORTAL_URL` in Amplify (or `.env.local` for localhost) so they match the deployed host.

### Universal / App Links

The site serves association files used by CareMate iOS/Android:

| Path | Purpose |
|------|---------|
| `/.well-known/apple-app-site-association` | iOS Universal Links (`TEAMID.com.softlyft.caremate`) |
| `/.well-known/assetlinks.json` | Android App Links (`com.softlyft.caremate` + Play signing SHA-256) |

Replace `TEAMID` and `REPLACE_WITH_PLAY_APP_SIGNING_SHA256` before relying on verified https opens.
Fallback pages exist for `/auth/*`, `/emergency/share/:token`, and `/billing/*` when the app is not installed.
