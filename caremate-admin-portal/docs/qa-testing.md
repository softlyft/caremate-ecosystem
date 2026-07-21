# QA Testing

Manual QA guide for the CareMate admin portal.

## Scope

This suite covers the implemented operator-facing areas:

- Staff authentication and route protection
- Users admin workflows
- Learn/articles workflows
- Health tips workflows
- Provider ingest and archive workflows
- Billing price management and subscriber visibility

## Test Environments

Recommended coverage:

- Local development against the shared Supabase project
- Staff user accounts for each role where possible:
  - `admin`
  - `editor`
  - `support`
- Provider ingestion service running locally when testing upload flows

## Preconditions

Before running the suite:

1. `caremate-admin-portal/.env.local` is configured
2. Shared Supabase migrations are pushed
3. At least one staff user exists via `bootstrap:admin`
4. `caremate-provider-ingestion` is running if you are testing provider upload

## Smoke Checklist

### Portal access

- Open `/login`
- Sign in with a valid staff account
- Confirm redirect to `/dashboard`
- Reload a dashboard page and confirm session persists

### Route protection

- Visit `/dashboard` while signed out
- Confirm redirect to `/login`
- Sign in with a non-staff user if available
- Confirm non-staff access is blocked

## Role-Based Checks

### Admin

Should be able to:

- manage users
- assign roles
- edit catalogs
- manage billing

### Editor

Should be able to:

- edit articles
- edit tips
- upload/archive providers

Should not be able to:

- manage users
- manage billing

### Support

Should be able to:

- manage users

Should not be able to:

- edit catalogs
- manage billing

## Users Workflow Tests

- Open `/dashboard/users`
- Search for a known email
- Open a user detail page
- Disable/enable a user
- Trigger password reset
- Change role as admin
- Verify support cannot assign roles

Expected:

- actions complete without server errors
- visible role restrictions match backend permissions

## Learn / Articles Tests

- Open `/dashboard/learn`
- Create a new article
- Edit an existing article
- Publish/update article metadata
- Soft-delete an article if delete/archive is exposed
- Upload/select media where applicable

Expected:

- list reflects updates after save
- article form validation blocks bad submissions
- uploaded media resolves to a public URL if that flow is used

## Health Tips Tests

- Open `/dashboard/tips`
- Create a tip
- Edit a tip
- Toggle active/inactive if exposed
- Delete/archive a tip

Expected:

- list refreshes after save
- soft-delete behavior hides the tip from normal management views where intended

## Providers Tests

### Upload

- Open `/dashboard/providers/upload`
- Upload an organization workbook
- Poll until the job completes
- Repeat for location and healthcare service workbooks in order

Expected:

- upload returns an accepted job
- job status progresses from accepted/running to completed or failed
- completed jobs show useful IDs/details

### Archive

- Open a provider detail page
- Archive the provider
- Confirm it is no longer active in the providers projection view

### Failure cases

- Upload the wrong resource order
- Upload a non-Excel file
- Test with ingest service down

Expected:

- operator sees a useful failure message
- portal does not silently succeed

## Billing Tests

- Open `/dashboard/billing` as admin
- Edit a subscription price
- Save changes
- Verify changes persist after reload
- Open `/dashboard/billing/transactions` and `/dashboard/billing/subscribers`
- Add a subscriber (Patient ID + plan) when no active entitlement exists
- Upgrade to Family for a Standard subscriber with a household

Expected:

- admins can update prices
- non-admins cannot manage billing transactions/subscribers
- transactions and subscriber lists load when rows exist
- admin grant / upgrade write `subscriptions` and audit events

## Audit log Tests

- Open `/dashboard/audit` as staff
- Create or update an article (or tip)
- Reload Audit logs and confirm a create/update row appears
- Filter by operation, action, entity, and actor email

Expected:

- events list newest-first
- filters narrow the table
- non-staff cannot access dashboard (middleware); staff can browse audit

## Commands

Useful local checks:

```bash
npm run lint -w caremate-admin-portal
npm run typecheck -w caremate-admin-portal
npm run test -w caremate-admin-portal
```

## Known Constraints

- Automated test coverage is currently minimal
- Audit events are written server-side and browsable at `/dashboard/audit`
- Provider upload depends on the external ingestion service and matching API key configuration
- Large user/subscriber sets may be limited by current list-query caps
