# Community Portal — QA Testing

## Setup

1. Apply community migrations (`community_portal_phase1` + `community_join_patient_verification`).
2. Configure `.env.local` with Supabase keys (including service role for join verification).
3. Start portal: `npm run community-portal:dev`.
4. Ensure at least one **active** chapter exists via SoftLyft admin (`/dashboard/community/chapters`).

## Contributor enrollment

- [ ] Enter an unknown Patient ID and confirm enrollment is rejected
- [ ] Enter a registered 12-digit CareMate Patient ID
- [ ] Confirm a masked registered email is shown
- [ ] Confirm the inline code appears only in non-production (or when `ALLOW_INLINE_OTP=true`)
- [ ] Enter an incorrect code and confirm verification is rejected
- [ ] Verify with the correct code
- [ ] Select only from active, admin-created chapters
- [ ] Join immediately (approved membership)
- [ ] Confirm no `community_profiles` identity row is created
- [ ] Sign in with the existing CareMate account and land on `/app/dashboard`

## Member surfaces

- [ ] View chapter on `/app/community`
- [ ] Register for an event on `/app/events`
- [ ] Download a resource on `/app/resources`
- [ ] View badges/certificates on `/app/recognition`
- [ ] Check profile (canonical CareMate fields) and contribution summary on `/app/profile`

## Community Lead flow

- [ ] Access `/app/leader` as lead/deputy
- [ ] Create event on `/app/events/manage`
- [ ] Mark attendance / export list
- [ ] Publish announcement
- [ ] Upload gallery item

## Admin flow (caremate-admin-portal)

- [ ] Open `/dashboard/community`
- [ ] Create an active chapter from `/dashboard/community/chapters`
- [ ] Select Nigeria → State (e.g. Lagos) and confirm LGA options cascade for that state
- [ ] Choose **Other** on a level and confirm free-text custom values save
- [ ] Select Ghana / Kenya and confirm their cascading labels/options replace Nigeria's
- [ ] Leave lower levels empty and confirm country-only chapter creation works
- [ ] Edit an existing chapter (name, status, hierarchy) and confirm updates persist
- [ ] Confirm chapter table displays country and populated lower levels
- [ ] Create or activate chapters; assign lead/deputy
- [ ] Review community members (from `profiles` + memberships)
- [ ] Create badge/certificate and award to user
- [ ] View reports

## Notifications

- [ ] Successful join creates a welcome notification
- [ ] Event registration creates reminder notification
- [ ] Badge / certificate award creates notification

## Public website

- [ ] `/ccn` marketing page loads and CTAs point to join + `/ccn/guide`
- [ ] `/ccn/guide` documents Patient ID enrollment accurately
- [ ] CareMate app Me → **Join our movement** opens `{EXPO_PUBLIC_WEBSITE_URL}/ccn` (prod: `https://getcaremate.com/ccn`)
