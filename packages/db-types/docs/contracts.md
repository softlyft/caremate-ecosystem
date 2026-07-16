# Contracts

## Main Export Surface

The package exports:

- `Database`
- `Json`
- table row aliases such as `Article`, `Provider`, `HealthTip`, `Profile`, `Settings`, `EmergencyProfile`, `Bookmark`, `MiniAppSnapshot`, `SubscriptionPrice`, `Subscription`
- provider-resource aliases such as `ProviderOrganization`, `ProviderLocation`, `ProviderHealthcareService`
- generic helpers `Tables`, `TablesInsert`, `TablesUpdate`

## Consumers

### Mobile app

The mobile app uses these contracts to:

- type remote rows in sync handlers
- map Supabase data into SQLite repositories
- type billing/provider/article payloads

### Admin portal

The portal uses these contracts to:

- type Supabase server/browser/admin clients
- type repository rows and action payloads
- align UI behavior with the shared schema

## Relationship to Supabase

The contracts are generated from the linked Supabase project and then extended with a small alias layer that the CareMate codebases expect.

The package does not define schema by itself; it mirrors shared backend contracts for consumers.
