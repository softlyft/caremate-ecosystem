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

## PHI fields encrypted

**Profile:** `date_of_birth`, `national_id`, `phone`, `address_line`, `city`, `postal_code`, `state`, `gender`, `marital_status`

**Emergency:** `blood_group`, `genotype`, `allergies`, `current_medications`, `chronic_conditions`, `emergency_contacts`, `preferred_hospital`, `insurance_provider`, `notes`

Left plaintext: ids, `user_id`, `patient_id`, `email`, `full_name`, avatar/photo URLs, locale flags, `emergency_share_token`, timestamps.

## Crypto model

- Per-user AES-256 data encryption key (DEK), wrapped with `GATEWAY_MASTER_KEY` and stored in `user_encryption_keys`.
- Field envelope: `v1:<iv_b64>:<tag_b64>:<cipher_b64>` (AES-256-GCM).
- Emergency array PHI fields stay `jsonb`; ciphertext is stored as a JSON string value so legacy mobile upserts remain compatible until cutover.
- Legacy plaintext values (no `v1:` prefix, or raw JSON arrays) are returned as-is on read until re-encrypted via PUT.
- `GATEWAY_MASTER_KEY` is an env master key today; `field-cipher` / `EncryptionService` are ready to swap in a real KMS wrapper later.

## Monorepo layout

```
apps/api/                 HTTP entry
libs/common/              JWT guard, PHI field maps
libs/supabase-client/     Shared Supabase service-role client
libs/encryption/          DEK bootstrap + field crypto
libs/profile/             Profile APIs
libs/emergency/           Emergency APIs
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
| Merge / push to `main` | `dev` | `caremate-health-data-gateway-dev` | `caremate-health-data-gateway-dev` |
| Merge / push to `prod` | `prod` | `caremate-health-data-gateway-prod` | `caremate-health-data-gateway-prod` |

Path filter: only changes under `caremate-health-data-gateway/**` (or the workflow file) trigger deploy. Manual run: Actions → **Gateway CD** → `workflow_dispatch` → pick `dev` or `prod`.

**One-time AWS + GitHub setup**

1. IAM user with your custom SAM deploy policy + access key (use case: application running outside AWS).
2. In GitHub → Settings → Environments, create **`dev`** and **`prod`**.
3. Per environment, add secrets:
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
    EnvironmentName=dev \
    SupabaseUrl=... \
    SupabaseServiceRoleKey=... \
    SupabaseJwtSecret=... \
    GatewayMasterKey=...
```

Local HTTP (`main.ts`) and Lambda (`lambda.ts`) share `createGatewayApp()` — Nest is initialized once per cold start and reused on warm invocations.
## Mobile cutover

Mobile profile / emergency sync prefers the gateway when `EXPO_PUBLIC_HEALTH_DATA_GATEWAY_URL` is set, and **falls back to plaintext Supabase** if the gateway is unset, down, or errors. See [`caremate-mobile/docs/SYNC_ENGINE.md`](../caremate-mobile/docs/SYNC_ENGINE.md).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run start:dev` / root `gateway:dev` | Watch mode (local HTTP) |
| `npm run build` / root `gateway:build` | Nest compile |
| `npm run build:lambda` / root `gateway:build:lambda` | esbuild Lambda bundle |
| `npm test` | Unit tests (field cipher + PHI maps) |
