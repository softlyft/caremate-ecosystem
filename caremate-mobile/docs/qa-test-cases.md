# QA Test Cases

[← Back to index](./README.md)

Manual test suite for CareMate QA. Covers **core tabs**, **domains** (auth, profile, family, emergency, sync), and **mini-apps**.

**App:** CareMate (`com.softlyft.caremate`)  
**Build:** Debug / release APK or iOS build as assigned  
**Related docs:** [Features](./features.md) · [Family](./family-profiles.md) · [Mini-Apps](./mini-apps.md) · [Auth](./authentication.md) · [Sync](./SYNC_ENGINE.md)

---

## How to use this suite

| Column | Meaning |
|--------|---------|
| **ID** | Stable case id — report bugs against this id |
| **P** | Priority: **P0** blocker / smoke · **P1** must-pass · **P2** important · **P3** nice |
| **Pre** | Preconditions |
| **Steps** | Exact user actions |
| **Expected** | Pass criteria |

**Environments to cover where noted:** online, offline (airplane mode), guest, signed-in.

**Accounts:** Use at least two real emails on the same Supabase project for spouse-connect cases (Account A / Account B).

**Legend for result tracking:** Pass / Fail / Blocked / N/A

---

## 0. Smoke (every build)

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| SM-01 | P0 | Fresh install | Launch app | Lands in onboarding when incomplete, otherwise enters the app successfully. No crash. |
| SM-02 | P0 | Running app | Tap all 5 tabs: Home, Learn, Nearby, Apps, Me | Each tab opens; tab bar highlights active tab. |
| SM-03 | P0 | Signed-in + online | Kill app → relaunch | Session restored; still signed in. |
| SM-04 | P0 | Any | Force-close during Home load → reopen | Recovers without blank freeze. |

---

## 1. Authentication & guest

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| AU-01 | P0 | Guest | Me → Create Account → fill valid first/last, phone, email, password (≥6) → Create | Account creates; lands in app signed-in. |
| AU-02 | P0 | Signed-out | Me → Sign In → valid email/password | Signs in; Me shows email / user label; local profile/emergency rows exist without waiting on sync. |
| AU-03 | P1 | — | Register with invalid email | Validation error; no submit success. |
| AU-04 | P1 | — | Register with short password | “Password must be at least 6 characters”. |
| AU-05 | P1 | Existing account | Register again with same email | Clear failure message (e.g. already registered). |
| AU-06 | P1 | — | Login with wrong password | Registration/login failure alert; stay on form. |
| AU-07 | P1 | Supabase configured; Redirect URL allowlisted | Forgot password → enter registered email → submit | “Check your email” success; no crash. |
| AU-07b | P1 | Reset email received on device | Open reset link → app opens reset screen → set matching new passwords → submit | Password updated; can sign in with new password. |
| AU-07c | P2 | Expired/invalid reset link | Open stale link or open `/auth/reset-password` cold | Link expired / request-new-link path; no crash. |
| AU-08 | P0 | Guest | Browse Home / Learn / Nearby / Apps | All usable without account. |
| AU-09 | P0 | Signed-in | Me → Sign Out | Returns to guest state; CTAs to Sign In / Create Account. |
| AU-10 | P2 | Signed-in | Me tab preferences | Biometric unlock toggle is not shown (deferred until app-lock is enforced). |
| AU-11 | P2 | — | — | Reserved for biometric app-lock once implemented. |
| AU-12 | P1 | Airplane mode | Attempt login/register | User-facing network failure message (not raw stack trace). |

---

## 1b. Onboarding & setup

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| OB-01 | P0 | Fresh install / onboarding incomplete | Launch app | Onboarding intro opens instead of dropping straight into tabs. |
| OB-02 | P1 | Onboarding flow | Complete priorities, region, location, notifications, next | Flow advances through each step without dead-ends or crashes. |
| OB-02b | P1 | Priorities step with nothing selected | Tap Continue | Soft toast asks for at least one priority; navigation is blocked until a choice is made (Skip still allowed). |
| OB-03 | P1 | Onboarding with approximate mode / denied location | Continue through location step | Copy reflects selected country; Nearby later uses that country’s capital approximate pin (state not collected in UI yet). |
| OB-03b | P0 | Onboarding country step | Search/select Mexico, United States, Nigeria, then search Global | MX, US, and NG appear; Global does **not** appear in the country picker; MX offers English+Spanish; US English only; NG existing local languages. State field is not shown. |
| OB-04 | P1 | Onboarding complete | Relaunch app | Onboarding does not reappear on every launch. |
| OB-05 | P1 | Newly signed-in user | Complete post-signup setup screens | Emergency, family prompt, and done screens advance correctly. |

---

## 2. Home

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| HM-01 | P0 | Any | Open Home | Logo, greeting, tip, categories, articles row, providers row, emergency banner visible. |
| HM-02 | P0 | Signed-in with profile full name | Open Home | Greeting includes first name (e.g. “Good Morning, Ada! 👋”). |
| HM-03 | P0 | Guest | Open Home | Greeting without personal name (time-of-day only). |
| HM-04 | P1 | Online + country selected | Wait on Home | Featured shows 1 CareMate article, then up to 2 INT news, then up to 2 country news. If country news is empty, only CareMate + INT appear. |
| HM-04b | P1 | Online; Currents country empty | Wait on Home | Country slots hidden; INT news still shown when available. |
| HM-05 | P1 | Offline | Open Home | Offline banner; previously cached / evergreen content still shown. |
| HM-05b | P1 | Article feed query fails with no cache | Open Home | ErrorState with Retry; Retry reloads feed. |
| HM-06 | P1 | Any | Tap search bar | Opens Search screen with focused input; glossy back + teal search shell. |
| HM-06b | P0 | Seeded content | Search for a known article keyword | Article results shown; tap opens detail. |
| HM-06c | P1 | Seeded providers | Search for a provider name | Nearby results shown; tap opens detail. |
| HM-06d | P1 | Any | Search “medication” | Medication Assistant appears under Tools. |
| HM-06e | P1 | Search query fails | Search with a keyword while search backend errors | ErrorState with Retry (not empty “No results”). |
| HM-06f | P2 | Idle search | Open Search with empty query | Idle card + Articles / Nearby / Tools hint chips. |
| HM-06g | P2 | Results present | Tap “See all in Learn / Nearby” | Opens tab with `?q=` applied. |
| HM-07 | P1 | Any | Tap a health category chip | Opens Learn filtered by that category. |
| HM-08 | P1 | Any | Tap a featured article | Opens article detail. |
| HM-09 | P1 | Any | Tap a nearby provider card | Opens provider detail. |
| HM-10 | P1 | Any | Tap emergency banner CTA | Opens emergency flow. |

---

## 3. Learn (articles)

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| LN-01 | P0 | Any | Open Learn tab | Feed shows (evergreen and/or news). |
| LN-02 | P1 | Online + Currents configured | Signed-in with country NG | Refresh pulls INT + NG news (tagged); Home country block uses NG only when available. |
| LN-03 | P1 | Guest | Learn tab | International-oriented news behavior; evergreen present. |
| LN-04 | P1 | Any | Search by keyword in title | Matching articles filter. |
| LN-05 | P1 | Any | Clear search | Full feed returns. |
| LN-06 | P1 | Category filter | Select category | Only that category shown. |
| LN-07 | P0 | Any | Open article detail | Title + body readable. |
| LN-08 | P1 | Article with `sourceUrl` | Tap “Read full article” if present | Opens external browser/link. |
| LN-09 | P1 | Bookmarks | Toggle bookmark on card/detail → open Bookmarks | Article appears; toggle off removes it. |
| LN-09b | P0 | Any | Open article detail | Status becomes Reading; appears under Learn → Reading. |
| LN-09c | P0 | Open article | Scroll near end or tap mark-as-read | Status becomes Read; shows under Reading → Read tab. |
| LN-09d | P1 | Read article | Tap mark-as-read again | Cleared / unread; removed from Read list. |
| LN-10 | P1 | Offline | Open Learn / open saved article | Cached content readable; no crash. |

---

## 4. Nearby (providers)

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| NB-01 | P0 | Online or previously cached providers | Open Nearby | Provider list loads from nearby results or cached rows; screen does not crash if remote fetch fails. |
| NB-01b | P1 | Nearby query fails with no cache | Open Nearby | ErrorState with Retry (not empty-state copy). |
| NB-02 | P1 | List open | Filter All / Hospitals / Clinics / Pharmacies / Labs / Telemedicine / Blood Bank / Ambulance | List filters correctly for the available provider types. |
| NB-02b | P1 | List open | Search by provider name keyword | Matching providers remain; others hide. |
| NB-03 | P0 | Any | Open a provider | Detail shows name, type, contact, address as available. |
| NB-04 | P1 | Signed-in | Toggle favorite on detail | Favorite state persists after leave/reopen. |
| NB-05 | P2 | Guest | Toggle favorite | Still works locally (guest-scoped) or gated per product rule — confirm no crash. |
| NB-06 | P1 | Detail with address or coordinates | Tap Open in Maps | Device default maps app opens with the provider location. |
| NB-07 | P2 | Legacy map route | Open `/(app)/providers/map` | Redirects to Nearby tab. |
| NB-08 | P1 | Offline with cached provider data | Nearby tab | Cached providers still list successfully. |
| NB-09 | P1 | Location permission denied or approximate mode chosen | Open Nearby | App uses the approximate pin for the selected country/state and still attempts to show providers; approximate-location caption may show. |
| NB-10 | P1 | Precise mode + GPS granted while device is far from selected region | Open Nearby | Live GPS is used (no country-bounds discard); ranking follows device position. |
| NB-11 | P0 | Signed-in; provider org claimed/verified; no connection row | Provider detail | **Connect with provider** visible; send request → pending. |
| NB-12 | P0 | Provider org not claimed / not verified | Provider detail | Connect button **not** shown. |
| NB-13 | P0 | Me → Connections | Open hub | Connected providers + Provider connection requests rows. |
| NB-14 | P0 | Inbound provider request | Decline with empty reason | Blocked; reason required. With reason → rejected. |

Full portal-side matrix: [`caremate-provider-portal/docs/qa-testing.md`](../../caremate-provider-portal/docs/qa-testing.md).

---

## 5. Emergency profile

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| EM-01 | P0 | Guest or signed-in | Me / Home → Emergency → create/edit | Can save full name + medical fields + at least one ICE contact. |
| EM-01b | P1 | Edit form | Try save with zero ICE contacts | Blocked with “at least one ICE contact” error. |
| EM-02 | P0 | Profile exists | View emergency profile | Shows blood group, genotype, allergies, meds, contacts, notes as entered. |
| EM-02b | P1 | Emergency query fails with no local row | Open Emergency view | ErrorState with Retry (not “no profile yet” empty). |
| EM-03 | P1 | Edit | Add emergency contact (name, phone, relationship) | Saved and displayed. |
| EM-04 | P1 | Edit | Change blood group / genotype chips | Selection persists. |
| EM-05 | P1 | Profile complete | Open QR screen | Preview opens; no crash. |
| EM-06 | P1 | Lock surface | Open `caremate://emergency-lock` or lock widget path | Public card shows key fields without login. |
| EM-07 | P1 | Offline | Edit then view emergency | Works fully offline. |
| EM-08 | P1 | Signed-in + online | Edit emergency → wait for sync | Remote / other device eventually reflects (if sync configured). |

---

## 6. Me (profile) & settings

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| ME-01 | P0 | Guest | Open Me | “Guest User”; Sign In / Create Account. |
| ME-02 | P0 | Signed-in | Open Me | Shows account identity; Sign Out available. |
| ME-03 | P0 | Signed-in | Me → Family card | Opens Family hub or setup. |
| ME-04 | P0 | Guest | Me → Family | Prompts sign-in (cannot manage family as guest). |
| ME-05 | P0 | Any | Me → Settings | Settings screen opens. |
| ME-06 | P1 | Settings | Open Settings | No appearance / dark-mode toggles; app stays light. |
| ME-07 | P1 | Settings | Toggle notifications | State persists after relaunch. |
| ME-08 | P1 | Signed-in | Settings → set country (e.g. Mexico) + language → Save | Saves; Learn/Home news context can use country. State/province is not shown in Settings UI. |
| ME-09 | P1 | Guest | Settings location | Explain that sign-in is required / control disabled. |
| ME-10 | P1 | Settings | Open Family from Settings | Same Family flow as Me entry. |
| ME-11 | P2 | Signed-in | Me preferences | Biometric unlock toggle is not shown until app-lock is enforced. |
| ME-12 | P1 | Signed-in | Me → Premium | Premium screen opens and current plan state loads without crash. |
| ME-13 | P1 | Guest | Me → Premium | Upgrade path prompts sign-in instead of attempting checkout anonymously. |
| ME-14 | P0 | Any | Settings → Privacy policy / Terms | Opens SoftLyft legal URLs in the system browser. |
| ME-15 | P0 | Signed-in | Settings → Delete account → confirm | Account removed; app returns to guest; cannot sign in with old credentials. |
| ME-16 | P1 | Guest | Settings account section | Delete account is hidden. |
| ME-17 | P0 | Signed-in + provider shared a file | Me → Documents | List shows title, type, provider; tap opens document. |
| ME-18 | P1 | Signed-in, no files | Me → Documents | Empty state invites upload. |
| ME-19 | P1 | Guest | Me → Documents | Sign-in prompt / guest copy. |
| ME-20 | P0 | Signed-in | Me → Documents → Upload | Title + type required; org optional (“Assign later”); pick file; appears in list as patient upload. |
| ME-21 | P0 | Patient doc with no org + approved connection | Link provider on row | Can assign approved org; provider can then see file in portal. |
| ME-22 | P1 | Patient doc already linked | Change provider | Can switch to another approved org or clear link. |

---

## 7. Family profiles (domain)

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| FM-01 | P0 | Signed-in, no household | Me → Family → Set up → Yes I’m a parent | Moves to kids count. |
| FM-01b | P1 | Household query fails | Open Family hub | ErrorState with Retry. |
| FM-02 | P0 | In setup | Enter N kids (e.g. 2) → Continue | Child 1 form appears. |
| FM-03 | P0 | Child form | Enter full name, DOB `YYYY-MM-DD`, gender → Next/Review | Advances; review lists kids. |
| FM-04 | P0 | Review | Create family | Household created; Family hub shows children. |
| FM-05 | P1 | Setup | Choose 0 kids → Review → Create | Household allowed; can add child later from hub. |
| FM-06 | P1 | Hub | Add another child (name, DOB, gender) | Appears in children list. |
| FM-06b | P1 | Hub inline add | DOB not YYYY-MM-DD or future date | Same validation messages as setup child form; child not saved. |
| FM-07 | P1 | Invalid DOB | Enter bad date | Validation error. |
| FM-08 | P0 | Hub + Account B exists + Family Premium owner | Invite member → enter B’s email → Find | Shows **full** profile card (name, email, phone, DOB, location if set). |
| FM-09 | P0 | Matched card | Tap Send invite | Success; pending request created for B; seat count updates. |
| FM-10 | P0 | Account B | Open Family → requests → Accept | B joins A’s household as family member; B’s personal profile/data stays B’s. |
| FM-10b | P1 | Requests query fails | Open Family requests | ErrorState with Retry (not empty list). |
| FM-11 | P1 | Account B | Decline request | Status declined; not added; seat freed. |
| FM-12 | P1 | Unknown email/phone | Find → not found | Shows copyable App Store / Play Store invite message (no token/deep link). |
| FM-13 | P1 | Not found | Copy / Share message | Clipboard or share sheet gets store links + install instructions; no invite URL with token. |
| FM-14 | P1 | Guest | Family entry | Blocked with sign-in. |
| FM-15 | P1 | Airplane mode | Create household + kids | Saves locally; syncs when back online. |
| FM-16 | P2 | Not a parent path | “Not right now” | Returns to Family without forcing kids. |
| FM-17 | P0 | Family Premium owner + 3 invited / pending | Try Send invite | Blocked; seats full copy. |
| FM-18 | P0 | Invited member (not owner) on Family hub | View Invite section | Owner-only hint; no lookup / send UI. |
| FM-19 | P0 | Owner + invited member listed | Remove member | Confirm → member removed; seat available again. |
| FM-20 | P1 | Owner + pending invite | Cancel invite | Pending cleared; seat freed. |

---

## 7b. Premium / billing

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| PM-01 | P1 | Signed-in | Open Premium | Current tier badge/state and pricing options load. |
| PM-02 | P1 | Signed-in, no household | Choose Family plan | App prompts user to set up family before family checkout. |
| PM-03 | P1 | Signed-in, household exists | Choose Family plan | Family plan selection is allowed and checkout path can start. |
| PM-04 | P1 | Signed-in, country ≠ NG | Choose Personal plan and tap checkout | Opens hosted payment in **USD** (Stripe); failures are shown as user-facing errors, not crashes. |
| PM-04a | P1 | Signed-in, country = NG | Choose Personal plan and tap checkout | Opens hosted payment in **NGN** (Paystack). |
| PM-04b | P1 | Signed-in, payment web open | Confirm Pay on payment site | Redirects to Paystack (NGN) or Stripe (USD); success returns via `caremate://billing/success`. |
| PM-05 | P1 | Signed-in, active Premium | Airplane mode for remainder of paid period | Profile still shows Premium; AdMob stays suppressed until `current_period_end`. |
| PM-06 | P1 | Signed-in, Premium period ended offline | Open app offline after period end | Tier falls back to Free locally without needing network. |
| PM-06b | P2 | Guest | Open Premium and try upgrade CTA | Guest is routed to login/sign-in path. |
| PM-07 | P0 | Active Standard + household | Premium → Upgrade to Family | Quote shows Family list price, Standard credit (days left), amount due; new Family end date is a full period from today. |
| PM-08 | P0 | Active Standard + household, charge > 0 | Confirm upgrade payment | Standard canceled; Family active from today; Premium shows Family. |
| PM-09 | P1 | Active Standard, credit covers Family | Upgrade with amount due 0 | Activates Family without gateway; Standard canceled. |
| PM-10 | P1 | Active Standard, no household | Choose Family upgrade | Prompts to set up family before upgrade. |
| PM-11 | P1 | Active Standard | Try normal Family checkout | Blocked; must use upgrade path (credit). |

---

## 8. Sync & offline-first (cross-cutting)

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| SY-01 | P0 | Signed-in | Airplane on → edit emergency/settings → airplane off | Changes eventually sync; no data loss. |
| SY-02 | P1 | Two devices same account | Edit profile/location on device 1 | Device 2 pull shows update after sync/foreground. |
| SY-03 | P1 | Guest | Make local emergency changes | Stay local; no crash when online. |
| SY-04 | P1 | Signed-in | Use mini-apps then sign out / sign in | Snapshots restore for that user when online (medication/period etc.). |
| SY-05 | P2 | Poor network | Repeated writes | App remains usable; sync retries without freezing UI. |

---

## 9. Apps tab (launcher)

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| AP-01 | P0 | Any | Open Apps | All 6 mini-apps listed with icons. |
| AP-02 | P0 | Any | Open each mini-app | Each opens its home screen without crash. |
| AP-03 | P2 | Coming soon flag (if any) | Tap disabled card | Cannot open / shows coming soon. |

---

## 10. Medication Assistant

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| MD-01 | P0 | Any | Apps → Medication Assistant | Dashboard opens (Due now / Upcoming / Taken). |
| MD-02 | P0 | — | Add medicine → Name, dosage, once daily, start today → save | Appears in list; today’s dose slot shown with time. |
| MD-02b | P0 | Add medicine | Set treatment to 7 days (or custom end) → save | Doses appear only through the end date; day after end has no slots. |
| MD-03 | P0 | Add medicine screen | See **Is this for a kid?** | Field visible with No / Yes options **above** name/dosage. |
| MD-04 | P0 | Family kids exist | Yes — for a kid → select child → save | Medicine shows child name on list/doses. |
| MD-05 | P1 | No family kids | Yes — for a kid | CTA to set up / open Family; cannot save for kid without selection. |
| MD-06 | P1 | Guest | Yes — for a kid | Sign-in / family setup messaging. |
| MD-07 | P0 | Due dose today | Tap dose row | Marks taken; tap again undoes. |
| MD-08 | P1 | Twice / three times daily | Add & view today | Correct number of slots/labels and times. |
| MD-09 | P1 | As needed | Log multiple doses same day | Allowed; open “as needed” row remains after first log. |
| MD-10 | P1 | Filter chips | After kid meds exist | All / You / child filters work. |
| MD-11 | P1 | Edit medicine | Pause / remove | Pause hides from active today; remove clears logs. |
| MD-11b | P0 | Edit medicine | Change start date to a past day → save → reopen | Past start date retained; calendar opens on that month. |
| MD-12 | P1 | Log dose modal | Pick medicine/date/slot → save | Log recorded; paused meds not listed. |
| MD-13 | P1 | Offline | Add + log doses | Works offline. |
| MD-14 | P1 | Scheduled med | Before slot time | Slot shows Upcoming; at/after time → Due. |
| MD-15 | P1 | Due dose untaken >60 min | Open app / Home | Inbox shows dose due then missed (no duplicates on re-open). |
| MD-16 | P1 | Medicine with quantity + threshold | Take doses until at/below threshold | Inbox refill reminder; History shows past logs. |
| MD-17 | P0 | Free, 3 active, 1 paused | Reactivate paused medicine | Blocked; upgrade CTA (cannot bypass 3-active cap). |
| MD-18 | P1 | Any with logs | Open History | Logs grouped by date; filter by medicine works. |

---

## 11. Immunization Tracker

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| IM-01 | P0 | Guest | Open Immunization | Sign-in required message. |
| IM-02 | P0 | Signed-in, no family | Open Immunization | Prompts **Set up family** (cannot add child in tracker). |
| IM-03 | P0 | Family with kids + DOB | Open Immunization | Children load; switcher chips; schedule for active child. |
| IM-04 | P1 | Family, kids without DOB only | Open Immunization | Treats as needs children / incomplete; directs to Family. |
| IM-05 | P0 | Child loaded | Log a vaccine | Record shows completed on schedule. |
| IM-06 | P1 | Multi-child | Switch child chip | Schedule/records switch per child. |
| IM-07 | P1 | Setup route | Open immunization setup | Redirects to Family (no local add-child form). |
| IM-08 | P1 | Overdue vaccine | View attention card | Shows overdue/due soon; can log from CTA. |
| IM-09 | P1 | Offline | View schedule / log | Works with local family children. |

---

## 12. Checkup Planner

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| CK-01 | P0 | Fresh | Open Checkup Planner → setup | Enter **your** DOB, gender, optional region (not a child). |
| CK-02 | P0 | Profile set | View this year | Age-appropriate checkups listed. |
| CK-03 | P1 | Female age band | Setup female 30 | Cervical screening eligible items appear when in range. |
| CK-04 | P1 | Male 50+ | Setup | Prostate discussion items appear. |
| CK-05 | P1 | Toggle next year | Switch year | Checklist uses next calendar year. |
| CK-06 | P0 | Due item | Log completion | Status → completed for that year. |
| CK-07 | P1 | Region NG vs INT | Change region | Region-specific items show/hide appropriately. |
| CK-08 | P2 | Educational copy | Read disclaimer | Guidance-only messaging present. |

---

## 13. Pregnancy Tracker

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| PG-01 | P0 | Fresh | Setup pregnancy (due date / LMP per UI) | Tracker shows week/progress; Period Tracker auto-pauses. |
| PG-02 | P1 | Active pregnancy | Daily log | Saves notes/symptoms for day. |
| PG-03 | P1 | Edit nickname if available | Change baby nickname | Updates on home. |
| PG-04 | P1 | Offline | Setup + log | Persists locally. |
| PG-05 | P2 | Clear/reset if offered | Reset pregnancy | Returns to empty/setup state safely. |

---

## 14. Period Tracker

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| PR-01 | P0 | Fresh | Open Period Tracker | Calendar / cycle UI loads. |
| PR-02 | P0 | Log period | Mark start/end dates | Predictions / cycle update. |
| PR-03 | P1 | Multiple cycles | Log another period | History updates. |
| PR-04 | P1 | Offline | Log while offline | Persists. |
| PR-05 | P2 | Signed-in sync | Log → other device | Snapshot restores when online. |
| PR-06 | P0 | Pregnancy setup completed | Open Period Tracker | Paused state; no predictions; log CTA hidden. |
| PR-07 | P0 | Period paused (pregnant) | Resume period tracking | Predictions/logging return; Pause card shown while still pregnant. |
| PR-08 | P1 | Pregnant + resumed | Pause period tracking | Pauses again without clearing history. |

---

## 15. UI / navigation / regression

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| UI-01 | P1 | System dark mode | Open main tabs + Settings | UI stays light; text readable; no clipped critical CTAs. |
| UI-02 | P1 | Any stack screen | Hardware/gesture back | Returns to previous screen. |
| UI-03 | P1 | Modals (setup/log) | Dismiss modal | Returns to mini-app home. |
| UI-04 | P2 | Android adaptive icon | Install release APK | Launcher icon not clipped; logo readable. |
| UI-05 | P2 | Rotate if supported / large font | Accessibility font size | No permanent overflow crash. |
| UI-06 | P1 | Deep links | `caremate://emergency-lock` | Opens lock card. |

---

## Suggested smoke path (30 min)

1. SM-01 → SM-02  
2. AU-01 → HM-02  
3. EM-01 → EM-02  
4. FM-01…FM-04 → IM-03 → MD-03…MD-04  
5. LN-01 → NB-01 → SY-01  
6. Sign out AU-09 → guest AU-08  

---

## Ads (banner slots)

Requires portal migration + sync. Use dev client / EAS build for AdMob cases (not Expo Go).

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| AD-01 | P0 | Portal: `ads.enabled` on, slot `home.feed` = house, active house campaign | Open Home | House banner visible with CareMate labeling |
| AD-01b | P0 | Welcome campaign placements synced | Open Home | Tip ad (`home.tips`) and feed ad (`home.feed`) both can show |
| AD-01c | P0 | `learn.article_header` + `learn.article_footer` placements | Open any article | Ads before and after body |
| AD-01d | P0 | `nearby.provider` placement | Open provider detail | Ad before contact card |
| AD-01e | P0 | `pregnancy.timeline` + `pregnancy.footer` placements | Open Pregnancy Tracker (set up) | Ads before timeline and before update due date |
| AD-01f | P0 | `period.week` + `period.footer` placements | Open Period Tracker | Ads before this week calendar and before log period days |
| AD-02 | P0 | Slot mode = `off` for `home.feed` | Open Home | No banner in feed slot |
| AD-03 | P0 | Portal: master `ads.enabled` off | Open Home / Learn / Nearby | No ad banners anywhere |
| AD-04 | P1 | Slot = house, no active house inventory | Open slot surface | Empty slot — no AdMob/house fallback |
| AD-05 | P1 | Slot = sponsored, verified advertiser + active campaign | Open slot surface | Banner shows **Sponsored** label |
| AD-06 | P1 | Slot = sponsored, advertiser pending | Open slot surface | Empty slot |
| AD-07 | P1 | Slot = admob, free user, online, dev build | Open slot surface | AdMob test banner or empty on load failure |
| AD-07b | P1 | `pregnancy.timeline` or `period.week` = admob in portal | Open respective mini-app | AdMob banner in slot (same rules as Home/Learn) |
| AD-08 | P1 | Slot = admob, Premium user | Open slot surface | No AdMob (empty slot) |
| AD-09 | P1 | Slot = admob, airplane mode | Open slot surface | Empty slot |
| AD-10 | P2 | Tap house/sponsored CTA | — | In-app navigation; click event queued |
| AD-11 | P2 | Portal: change slot mode | Pull/sync app | New mode respected after sync |
| AD-12 | P1 | Same house campaign on Home + Learn article | View Home then open article | Article ads still eligible (per-slot frequency cap) |
| AD-13 | P2 | Fresh install / clear SQLite | Cold start online | Ad catalog present without waiting for manual sync |

---

## Premium & plans (entitlement gates)

Spec: [Premium & plans](./premium-and-plans.md). Gates are enforced — run these after billing QA above.

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| PG-01 | P0 | Guest | Open Apps tab; tap any mini-app | Sign-in / register prompt; no tracker UI |
| PG-02 | P0 | Free signed-in | Add 4th active medication (or reactivate when already at 3) | Blocked; upgrade CTA |
| PG-03 | P0 | Free signed-in | Checkup planner with 3+ items this year | First 2 visible; rest blurred |
| PG-04 | P0 | Free signed-in | Checkup planner next year | Year blurred |
| PG-05 | P0 | Standard Premium | Checkup + immunization | No blur; full schedule |
| PG-06 | P0 | Free signed-in | Immunization schedule | First 2 months clear; rest blurred |
| PG-07 | P1 | Free signed-in | Pregnancy / Period with ads enabled | Catalog or AdMob in slots |
| PG-08 | P1 | Standard Premium | Pregnancy / Period | No ads in mini-app slots |
| PG-09 | P0 | Free household | Add 2nd child | Blocked; Family upgrade CTA |
| PG-10 | P0 | Free / Standard | Invite family member | Blocked; Family upgrade CTA |
| PG-11 | P0 | Family Premium owner | Add multiple children + up to 3 adult invites | Allowed per family flows |
| PG-12 | P1 | Guest | Learn + Nearby + Emergency | Full access without account |

---

## Tab UX / spacing (smoke)

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| UX-01 | P1 | Any | Switch Home ↔ Learn ↔ Nearby repeatedly | No full-screen reload flash; scroll position retained |
| UX-02 | P2 | Learn | Tap category chips including All | Filters in place; no tab remount |
| UX-03 | P2 | Nearby | Swipe type chips horizontally | Single row scroll; each chip has icon + type color when selected |

---

## Out of scope / known gaps (do not fail unless regression)

| Area | Note |
|------|------|
| Bookmark toggle on Learn cards | Wired (local + sync when signed in) |
| Mark as read / reading history | Wired (`article_reads`) |
| Provider map | No in-app map; Open in Maps uses system maps |
| Emergency Patient ID QR | On-device QR on the back of the Me → Patient ID card (tap to flip) |
| Biometric unlock | Hidden in UI until app-lock gate is implemented |
| Push notifications | Preference toggle may not deliver OS pushes yet |
| Premium gating | Enforced per [Premium & plans](./premium-and-plans.md); run PG-01–PG-12 in QA |
| Family adult invites | Owner invites up to 3; in-app request when account exists; otherwise copy/share store download message (no redeemable invite links); invitees cannot invite |
| Spouse join | Personal mini-app data stays per parent (shared household kids only) |

---

## Bug report template

```text
Test case ID:
Build / commit / APK:
Device / OS:
Account type: guest | signed-in
Network: online | offline
Steps:
Expected:
Actual:
Screenshots / video:
```
