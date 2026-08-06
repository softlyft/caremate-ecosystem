# CareMate website

Marketing site for CareMate — welcome page, patient guide, CareMate Community Network (CCN),
provider marketing + guide, privacy, and terms.

## Pages

| Path | Purpose |
|------|---------|
| `/` | Patient-facing welcome + CareMate for providers section |
| `/docs` | Docs hub — pick patient, community, or provider guide |
| `/docs/patient` | Patient guide (how to use the app) |
| `/docs/community` | Community enrollment + contributor guide |
| `/docs/providers` | Provider guide (claim, connections, messages, mark-as-staff) |
| `/articles` | Evergreen health article categories |
| `/articles/:category` | Articles in a category |
| `/articles/:category/:slug` | Article detail (canonical) |
| `/articles/:id` | Redirects to canonical category/slug (legacy app shares) |
| `/ccn` | Community Network marketing |
| `/providers` | Provider marketing (portal positioning) |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/refunds` | Refund policy (Premium / Family billing) |

Legacy guide URLs redirect: `/guide` → `/docs/patient`, `/ccn/guide` → `/docs/community`, `/providers/guide` → `/docs/providers`.


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

## Deploy

Monorepo Amplify app root: `caremate-website` (branch **`main`**). Spec: [`../amplify.yml`](../amplify.yml).  
Guide: [`../docs/amplify-hosting.md`](../docs/amplify-hosting.md).

After deploy, add SPA rewrite in Amplify Console for client routes (see amplify-hosting guide).

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

Legal pages are intended for production hosting (e.g. `https://getcaremate.com/privacy`, `/terms`, and `/refunds`). Set `VITE_SITE_URL` and `VITE_COMMUNITY_PORTAL_URL` in Amplify environment variables (or `.env.local` for localhost) so they match the deployed host.

### Universal / App Links

The site serves association files used by CareMate iOS/Android:

| Path | Purpose |
|------|---------|
| `/.well-known/apple-app-site-association` | iOS Universal Links (`TEAMID.com.softlyft.caremate`) |
| `/.well-known/assetlinks.json` | Android App Links (`com.softlyft.caremate` + Play signing SHA-256) |

Replace `TEAMID` and `REPLACE_WITH_PLAY_APP_SIGNING_SHA256` before relying on verified https opens.
Fallback pages exist for `/auth/*`, `/emergency/share/:token`, and `/billing/*` when the app is not installed.
