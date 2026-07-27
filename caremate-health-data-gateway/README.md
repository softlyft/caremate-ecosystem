# CareMate Health Data Gateway

NestJS monorepo trust layer for field-level PHI encryption. Schema and migrations live in the **root** [`supabase/`](../supabase/) folder — this package only connects via a service-role client.

## Services (this slice)

| Path | Auth | Behavior |
|------|------|----------|
| `GET /health` | none | Liveness |
| `POST /v1/crypto/bootstrap` | Bearer JWT | Create per-user DEK if missing |
| `PUT /v1/profile` | Bearer JWT | Encrypt PHI → upsert `profiles` |
| `GET /v1/profile` | Bearer JWT | Load + decrypt PHI for owner |
| `PUT /v1/emergency` | Bearer JWT | Encrypt PHI → upsert `emergency_profiles` |
| `GET /v1/emergency` | Bearer JWT | Load + decrypt PHI for owner |
| `PUT /v1/mini-app-snapshots` | Bearer JWT | Encrypt PHI **leaves** inside `payload` → upsert |
| `GET /v1/mini-app-snapshots` | Bearer JWT | List + decrypt PHI leaves for owner |
| `GET /v1/mini-app-snapshots/:appKey` | Bearer JWT | Load one app snapshot + decrypt leaves |

## PHI fields encrypted

**Profile:** `date_of_birth`, `national_id`, `phone`, `address_line`, `city`, `postal_code`, `state`, `gender`, `marital_status`

**Emergency:** `blood_group`, `genotype`, `allergies`, `current_medications`, `chronic_conditions`, `emergency_contacts`, `preferred_hospital`, `insurance_provider`, `notes`

**Mini-app snapshots:** clinical leaf values per `app_key` (medication names/doses/notes, vital readings, immunization dates, pregnancy/period logs, etc.). Left plaintext: ids, subject pointers (`forKid`, `familyMemberId`, `profileId`, `vaccineId`), enums (`type`, `unit`, `frequency`), and payload structure (“who” keys).

Left plaintext (profile/emergency): ids, `user_id`, `patient_id`, `email`, `full_name`, avatar/photo URLs, locale flags, `emergency_share_token`, timestamps.

## Crypto model

- Per-user AES-256 data encryption key (DEK), wrapped with `GATEWAY_MASTER_KEY` and stored in `user_encryption_keys`.
- Field envelope: `v1:<iv_b64>:<tag_b64>:<cipher_b64>` (AES-256-GCM).
- Emergency array PHI fields stay `jsonb`; ciphertext is stored as a JSON string value so legacy mobile upserts remain compatible until cutover.
- Legacy plaintext values (no `v1:` prefix, or raw JSON arrays) are returned as-is on read until re-encrypted via PUT.
- `GATEWAY_MASTER_KEY` is an env master key today; `field-cipher` / `EncryptionService` are ready to swap in a real KMS wrapper later.

## Monorepo layout

```
apps/api/                 HTTP entry
libs/common/              JWT guard, PHI field maps (+ mini-app leaf paths)
libs/supabase-client/     Shared Supabase service-role client
libs/encryption/          DEK bootstrap + field crypto
libs/profile/             Profile APIs
libs/emergency/           Emergency APIs
libs/mini-app-snapshots/  Mini-app snapshot APIs (leaf PHI encryption)
```

## Local run

```bash
cp .env.example .env
# fill SUPABASE_* + GATEWAY_MASTER_KEY + SUPABASE_JWT_SECRET

npm install   # from repo root (workspace) or this package
npm run gateway:dev
```

Default port: `3100`.

## AWS Lambda

The same Nest app runs on Lambda via `@codegenie/serverless-express`.

| Piece | Path |
|--------|------|
| Handler source | [`apps/api/src/lambda.ts`](apps/api/src/lambda.ts) |
| Shared bootstrap | [`apps/api/src/bootstrap.ts`](apps/api/src/bootstrap.ts) |
| Bundle output | `dist-lambda/lambda.js` → handler `lambda.handler` |
| SAM template | [`template.yaml`](template.yaml) |
| GitHub CD | [`.github/workflows/gateway-cd.yml`](../.github/workflows/gateway-cd.yml) |

### Git-based deploy (intended)

| Git event | GitHub Environment | CloudFormation stack | Lambda name |
|-----------|--------------------|----------------------|-------------|
| Merge / push to `main` | `development` | `caremate-health-data-gateway-development` | `caremate-health-data-gateway-development` |
| Merge / push to `prod` | `prod` | `caremate-health-data-gateway-prod` | `caremate-health-data-gateway-prod` |

Path filter: only changes under `caremate-health-data-gateway/**` (or the workflow file) trigger deploy. Manual run: Actions → **Gateway CD** → `workflow_dispatch` → pick `development` or `prod`.

Before `sam deploy`, the workflow deletes the stack if it is stuck in `ROLLBACK_COMPLETE` / `CREATE_FAILED` (so you do not need a local AWS CLI).

**One-time AWS + GitHub setup**

1. IAM user with your custom SAM deploy policy + access key (use case: application running outside AWS).
2. In GitHub → Settings → Environments, create **`development`** and **`prod`**.
3. Per environment, add **Environment secrets** (not only repository secrets — this job cannot see repo-level secrets):
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `GATEWAY_MASTER_KEY` (unique per env: `openssl rand -base64 32`)
4. Optional env var: `AWS_REGION` (default `us-east-1`).
5. After first successful deploy, copy the workflow summary **ApiEndpoint** into mobile `EXPO_PUBLIC_HEALTH_DATA_GATEWAY_URL` for that env (EAS / Amplify secrets).

OIDC (`AWS_ROLE_ARN`) can replace access keys later; the workflow is access-key-only for now.

Until AWS secrets exist, local `npm run gateway:dev` is enough; mobile can keep the URL blank (plaintext Supabase fallback).

### Manual SAM (optional)

```bash
npm run gateway:build:lambda
cd caremate-health-data-gateway
sam deploy --guided \
  --parameter-overrides \
    EnvironmentName=development \
    SupabaseUrl=... \
    SupabaseServiceRoleKey=... \
    SupabaseJwtSecret=... \
    GatewayMasterKey=...
```

Local HTTP (`main.ts`) and Lambda (`lambda.ts`) share `createGatewayApp()` — Nest is initialized once per cold start and reused on warm invocations.
## Mobile cutover

Mobile profile / emergency / **mini-app snapshots** use the gateway when `EXPO_PUBLIC_HEALTH_DATA_GATEWAY_URL` is set. Gateway auth accepts Supabase **ES256 JWKS** tokens (and legacy HS256). Mini-app PHI is encrypted as **leaf values** inside `payload` jsonb (ids / subject pointers stay plaintext). Sync failures stay queued — they do not fall back to plaintext. See [`caremate-mobile/docs/SYNC_ENGINE.md`](../caremate-mobile/docs/SYNC_ENGINE.md).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run start:dev` / root `gateway:dev` | Watch mode (local HTTP) |
| `npm run build` / root `gateway:build` | Nest compile |
| `npm run build:lambda` / root `gateway:build:lambda` | Nest compile **then** esbuild → `dist-lambda/` (must use tsc output so Nest DI metadata survives) |
| `npm test` | Unit tests (field cipher + PHI maps) |
