# Learn content model

[← Back to index](./README.md)

Phase 1 Learn is **articles only**. Phase 2 extends the same catalog to Video, Podcast, Campaign, Health Alert, FAQ, and Guide — without carving a new persistence tree per format.

## Design principle (same as Providers)

```
Today                         Tomorrow
─────                         ────────
Article                       Learn content item
  title / body / category       + contentType
  sourceUrl / image               article | video | podcast
                                  | campaign | health_alert
                                  | faq | guide
                                + attributes { … }
```

**One core entity**, discriminated by **`contentType`**, with shared bookmarking / feed / sync. Kind-specific media and metadata live in **`attributes`** until a field needs SQL indexes or strong validation.

Do **not** create separate `videos` / `podcasts` tables for Phase 2 launch. Promote columns later only when filtering/sorting demands it.

---

## Type catalog

Canonical list: `src/domains/articles/content-types.ts`

| Type | Label | Phase | Typical use |
|------|-------|-------|-------------|
| `article` | Article | 1 (now) | Evergreen + Currents text |
| `video` | Video | 2 | Hosted or linked video lessons |
| `podcast` | Podcast | 2 | Audio episodes |
| `campaign` | Campaign | 2 | Time-bound awareness / sponsor CTA |
| `health_alert` | Health Alert | 2 | Region/severity notices |
| `faq` | FAQ | 2 | Q&A cards |
| `guide` | Guide | 2 | Step-by-step health guides |

`PRIMARY_LEARN_CONTENT_TYPES` is the intended Learn chip / segment order once UI expands.

---

## Shared core fields (keep stable)

Mapped today on SQLite `articles` (table name may stay for compatibility; treat as **learn content** conceptually):

| Field | Role across kinds |
|-------|-------------------|
| `id` | Stable content id |
| `content_type` | Discriminator (default `article`) |
| `title` | Display title (FAQ question may also live in attributes) |
| `summary` | Card blurb / podcast description |
| `content` | Body: article HTML/text, guide fallback, FAQ answer, transcript notes |
| `category_id` / `category_name` | Heart, child, pregnancy, … (topic axis ≠ format axis) |
| `image_url` | Poster / cover art |
| `source_url` | External deep link (Currents article, YouTube, Spotify, …) |
| `published_at` | Publish / alert issue time |
| `attributes` | Kind-specific JSON bag |
| sync columns | Same offline outbox rules as other entities |

**Topic (category) and format (contentType) are orthogonal.** A video can be `categoryId: pregnancy` and `contentType: video`.

---

## `attributes` conventions (Phase 2)

```ts
// article
{ readingMinutes?: number; author?: string }

// video
{ mediaUrl: string; durationSec?: number; transcriptUrl?: string; thumbnailUrl?: string }

// podcast
{ audioUrl: string; durationSec?: number; episodeNumber?: number; showName?: string }

// campaign
{ startsAt?: string; endsAt?: string; ctaLabel?: string; ctaUrl?: string; sponsor?: string }

// health_alert
{ severity?: 'info' | 'warning' | 'critical'; expiresAt?: string; regionCodes?: string[] }

// faq
{ question: string; answerHtml?: string; relatedIds?: string[] }

// guide
{ steps?: Array<{ title: string; body: string }>; estimatedMinutes?: number }
```

Renderers choose layout from `contentType` and read only the keys they need.

---

## Feed & navigation (Phase 2 target)

```
Learn tab
  ├── Format chips: All | Article | Video | Podcast | …
  ├── Topic row: Heart | Child | …  (existing HEALTH_CATEGORIES)
  └── Cards → detail by contentType
        article  → text reader (+ optional sourceUrl)
        video    → player / external
        podcast  → audio controls / external
        guide    → stepped UI
        faq      → accordion / Q&A
        campaign → hero + CTA window
        health_alert → severity banner + expiry
```

Routes can stay under `/(app)/articles/...` initially or migrate to `/(app)/learn/[id]` — prefer one detail route that switches on `contentType`.

---

## Bookmarks & sync

| Topic | Phase 1 | Phase 2 prep |
|-------|---------|----------------|
| Bookmarks | `bookmarks.article_id` | Keep column; treat as **content id**. Optional rename later to `content_id` via migration |
| Sync entity | `articles` / `bookmarks` | Same outbox; payload gains `contentType` + `attributes` |
| Currents | Always `contentType: 'article'` | Unchanged |
| Evergreen seeds | Always `article` | New seed packs per type over time |

Guest/offline rules unchanged: SQLite first, Supabase when signed-in ([SYNC_ENGINE.md](./SYNC_ENGINE.md)).

---

## Suggested UI card matrix

| Type | Card emphasis |
|------|----------------|
| Article | Title, category, read time |
| Video | Thumbnail, duration badge |
| Podcast | Show name, duration, episode # |
| Campaign | CTA + date window |
| Health Alert | Severity color, expiry |
| FAQ | Question-first |
| Guide | Step count / est. minutes |

---

## Migration path (when implementing Phase 2)

1. Ensure `content_type` + `attributes` columns exist (scaffolded now; default `article` / `{}`).
2. Backfill: `UPDATE articles SET content_type = 'article' WHERE content_type IS NULL`.
3. Extend Learn tab filters with `PRIMARY_LEARN_CONTENT_TYPES`.
4. Add detail render branches; keep article path as default.
5. Author new seeds / CMS / Supabase rows with non-article types.
6. Only then consider renaming table `articles` → `learn_content` if the name becomes confusing.

---

## Anti-patterns

- Separate Domain + Repository per format on day one  
- Overloading `categoryId` to mean “video” vs “heart”  
- Putting large binary media in SQLite — store **URLs** in `attributes` / `source_url`  
- Blocking Phase 1 article UX on Phase 2 players  

---

## Related

| Piece | Path |
|-------|------|
| Type catalog | `domains/articles/content-types.ts` |
| Categories (topic) | `domains/articles/categories.ts` |
| Repository | `domains/articles/repository.ts` |
| Provider analogue | [Provider model](./provider-model.md) |
| Phase notes | [Roadmap](./roadmap.md) |
