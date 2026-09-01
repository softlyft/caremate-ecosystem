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

Mobile SQLite keeps external news for **7 calendar days**, keyed by `first_seen_at`. After that (or when unpublished), rows are **hard-deleted** from the device along with local bookmarks / read state for those articles.

## Device fetch cadence

The app pulls the article catalog (including external news) from Supabase when:

- The app **cold-starts** (`AppProviders` + sync engine startup cycle)
- The user opens **Home** or **Learn**
- The app returns to the **foreground**
- The device **reconnects** to the network
- Every **60 minutes** while the app is open (sync engine safety interval)
- Around **local midnight** while the app is running (daily safety sync)
- About **once per day** via the OS background task (minimum 24h; actual timing is OS-dependent)

There is no separate “news only” poll — external news rides along with the full article catalog pull. New Currents stories only appear on device after SoftLyft staff sync them into Supabase (manual today).
