# Community Portal — Auth

## Shared SSO

Uses the same Supabase project as CareMate mobile and provider portal. Users do not create a separate account.

## Environment

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Routes

| Route | Access |
|-------|--------|
| `/login` | Public |
| `/join` | Public enrollment for an existing CareMate patient |
| `/app/*` | Approved community member |

## Enrollment steps

1. Enter the 12-digit CareMate Patient ID.
2. Verify the six-digit code sent to the email on the canonical CareMate profile.
3. Select one of the active chapters created by an admin.
4. Join immediately, then sign in with the existing CareMate account.

During local development the code may be displayed in the UI (`NODE_ENV !== 'production'`).
Production never returns the OTP to the browser — wire email delivery (or set `ALLOW_INLINE_OTP`
only on controlled staging). See [`docs/security.md`](../../docs/security.md).
Enrollment never creates an Auth user or copies data from `profiles`.

Public how-to for members: CareMate website `/ccn/guide` ([website README](../../caremate-website/README.md)).

## Roles

| Role | Capabilities |
|------|--------------|
| Member | View, register for events, download resources |
| Deputy Lead | Lead capabilities except delete chapter |
| Community Lead | Approve members, manage events/announcements/gallery |
| Admin (staff) | Full management via admin portal |
