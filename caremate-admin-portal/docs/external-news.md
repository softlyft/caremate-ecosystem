# External news (Currents)

SoftLyft staff pull health news from Currents into Supabase. The mobile app never calls Currents.

## Flow

1. Catalog → **External News**
2. Click **Sync INT (15)** or **Sync NG (15)** (manual only for now)
3. New rows insert as **published** with `first_seen_at` set once
4. Re-syncing the same Currents id **updates content/regions** but **never moves** `first_seen_at`
5. Unpublish hides the row from device sync; soft-delete sends a tombstone

## Env

```bash
CURRENTS_API_KEY=...
```

Server-only. Also add it to Amplify env for `caremate-admin-portal` (written into `.env.production` by root `amplify.yml`).

## Device retention

Mobile SQLite keeps external news for **7 calendar days**, keyed by `first_seen_at`.
