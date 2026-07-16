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
| AU-02 | P0 | Signed-out | Me → Sign In → valid email/password | Signs in; Me shows email / user label. |
| AU-03 | P1 | — | Register with invalid email | Validation error; no submit success. |
| AU-04 | P1 | — | Register with short password | “Password must be at least 6 characters”. |
| AU-05 | P1 | Existing account | Register again with same email | Clear failure message (e.g. already registered). |
| AU-06 | P1 | — | Login with wrong password | Registration/login failure alert; stay on form. |
| AU-07 | P1 | Supabase configured; Redirect URL allowlisted | Forgot password → enter registered email → submit | “Check your email” success; no crash. |
| AU-07b | P1 | Reset email received on device | Open reset link → app opens reset screen → set matching new passwords → submit | Password updated; can sign in with new password. |
| AU-07c | P2 | Expired/invalid reset link | Open stale link or open `/auth/reset-password` cold | Link expired / request-new-link path; no crash. |
| AU-08 | P0 | Guest | Browse Home / Learn / Nearby / Apps | All usable without account. |
| AU-09 | P0 | Signed-in | Me → Sign Out | Returns to guest state; CTAs to Sign In / Create Account. |
| AU-10 | P2 | Signed-in, device with biometrics | Enable biometric unlock on Me | Preference persists and toggle state is restored after relaunch. |
| AU-11 | P2 | No biometrics hardware/enroll | Enable biometric | App handles the unsupported case gracefully and does not crash. |
| AU-12 | P1 | Airplane mode | Attempt login/register | User-facing network failure message (not raw stack trace). |

---

## 1b. Onboarding & setup

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| OB-01 | P0 | Fresh install / onboarding incomplete | Launch app | Onboarding intro opens instead of dropping straight into tabs. |
| OB-02 | P1 | Onboarding flow | Complete priorities, region, location, notifications, next | Flow advances through each step without dead-ends or crashes. |
| OB-03 | P1 | Onboarding with approximate mode / denied location | Continue through location step | Flow completes with fallback/default location behavior. |
| OB-04 | P1 | Onboarding complete | Relaunch app | Onboarding does not reappear on every launch. |
| OB-05 | P1 | Newly signed-in user | Complete post-signup setup screens | Emergency, family prompt, and done screens advance correctly. |

---

## 2. Home

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| HM-01 | P0 | Any | Open Home | Logo, greeting, tip, categories, articles row, providers row, emergency banner visible. |
| HM-02 | P0 | Signed-in with profile full name | Open Home | Greeting includes first name (e.g. “Good Morning, Ada! 👋”). |
| HM-03 | P0 | Guest | Open Home | Greeting without personal name (time-of-day only). |
| HM-04 | P1 | Online | Wait on Home | Trending articles populate or keep evergreen if Currents fails. |
| HM-05 | P1 | Offline | Open Home | Offline banner; previously cached / evergreen content still shown. |
| HM-06 | P1 | Any | Tap search bar | Opens Search screen with focused input. |
| HM-06b | P0 | Seeded content | Search for a known article keyword | Article results shown; tap opens detail. |
| HM-06c | P1 | Seeded providers | Search for a provider name | Nearby results shown; tap opens detail. |
| HM-06d | P1 | Any | Search “medication” | Medication Tracker appears under Tools. |
| HM-07 | P1 | Any | Tap a health category chip | Opens Learn filtered by that category. |
| HM-08 | P1 | Any | Tap a featured article | Opens article detail. |
| HM-09 | P1 | Any | Tap a nearby provider card | Opens provider detail. |
| HM-10 | P1 | Any | Tap emergency banner CTA | Opens emergency flow. |

---

## 3. Learn (articles)

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| LN-01 | P0 | Any | Open Learn tab | Feed shows (evergreen and/or news). |
| LN-02 | P1 | Online + Currents configured | Signed-in with country NG | Local/country news attempt; feed still not empty if API empty (fallback). |
| LN-03 | P1 | Guest | Learn tab | International-oriented news behavior; evergreen present. |
| LN-04 | P1 | Any | Search by keyword in title | Matching articles filter. |
| LN-05 | P1 | Any | Clear search | Full feed returns. |
| LN-06 | P1 | Category filter | Select category | Only that category shown. |
| LN-07 | P0 | Any | Open article detail | Title + body readable. |
| LN-08 | P1 | Article with `sourceUrl` | Tap “Read full article” if present | Opens external browser/link. |
| LN-09 | P2 | Bookmarks screen | Open Bookmarks from Learn | Screen opens; list empty or shows bookmarks. **Note:** toggle may be decorative on cards — record as gap if cannot bookmark. |
| LN-10 | P1 | Offline | Open Learn / open saved article | Cached content readable; no crash. |

---

## 4. Nearby (providers)

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| NB-01 | P0 | Online or previously cached providers | Open Nearby | Provider list loads from nearby results or cached rows; screen does not crash if remote fetch fails. |
| NB-02 | P1 | List open | Filter All / Hospitals / Clinics / Pharmacies / Labs / Telemedicine / Blood Bank / Ambulance | List filters correctly for the available provider types. |
| NB-02b | P1 | List open | Search by provider name keyword | Matching providers remain; others hide. |
| NB-03 | P0 | Any | Open a provider | Detail shows name, type, contact, address as available. |
| NB-04 | P1 | Signed-in | Toggle favorite on detail | Favorite state persists after leave/reopen. |
| NB-05 | P2 | Guest | Toggle favorite | Still works locally (guest-scoped) or gated per product rule — confirm no crash. |
| NB-06 | P1 | Detail with coordinates | Open directions link | External maps URL opens. |
| NB-07 | P2 | Map entry | Open Map screen | Placeholder/coordinate list loads (not a full interactive map yet). |
| NB-08 | P1 | Offline with cached provider data | Nearby tab | Cached providers still list successfully. |
| NB-09 | P1 | Location permission denied or approximate mode chosen | Open Nearby | App falls back to default supported coordinates and still attempts to show providers. |
| NB-10 | P1 | Device location outside Nigeria (or emulator default outside service area) | Open Nearby | App falls back to Lagos/default supported coordinates rather than showing a broken empty flow. |

---

## 5. Emergency profile

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| EM-01 | P0 | Guest or signed-in | Me / Home → Emergency → create/edit | Can save full name + medical fields. |
| EM-02 | P0 | Profile exists | View emergency profile | Shows blood group, genotype, allergies, meds, contacts, notes as entered. |
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
| ME-06 | P1 | Settings | Toggle system / dark theme | UI theme updates. |
| ME-07 | P1 | Settings | Toggle notifications | State persists after relaunch. |
| ME-08 | P1 | Signed-in | Settings → set country (e.g. Nigeria) + state → Save | Saves; Learn/Home news context can use country. |
| ME-09 | P1 | Guest | Settings location | Explain that sign-in is required / control disabled. |
| ME-10 | P1 | Settings | Open Family from Settings | Same Family flow as Me entry. |
| ME-11 | P2 | Signed-in | Me biometric toggle | Persist as AU-10; this is preference persistence, not a verified app-lock gate. |
| ME-12 | P1 | Signed-in | Me → Premium | Premium screen opens and current plan state loads without crash. |
| ME-13 | P1 | Guest | Me → Premium | Upgrade path prompts sign-in instead of attempting checkout anonymously. |

---

## 7. Family profiles (domain)

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| FM-01 | P0 | Signed-in, no household | Me → Family → Set up → Yes I’m a parent | Moves to kids count. |
| FM-02 | P0 | In setup | Enter N kids (e.g. 2) → Continue | Child 1 form appears. |
| FM-03 | P0 | Child form | Enter full name, DOB `YYYY-MM-DD`, gender → Next/Review | Advances; review lists kids. |
| FM-04 | P0 | Review | Create family | Household created; Family hub shows children. |
| FM-05 | P1 | Setup | Choose 0 kids → Review → Create | Household allowed; can add child later from hub. |
| FM-06 | P1 | Hub | Add another child (name, DOB, gender) | Appears in children list. |
| FM-07 | P1 | Invalid DOB | Enter bad date | Validation error. |
| FM-08 | P0 | Hub + Account B exists | Connect spouse → enter B’s email → Find | Shows **full** profile card (name, email, phone, DOB, location if set). |
| FM-09 | P0 | Matched card | Tap Connect | Success; pending request created for B. |
| FM-10 | P0 | Account B | Open Family → requests → Accept | B joins A’s household as spouse; B’s personal profile/data stays B’s. |
| FM-11 | P1 | Account B | Decline request | Status declined; not added as spouse. |
| FM-12 | P1 | Unknown email/phone | Find → not found | Message + generate/share invite (no automatic SMS/email). |
| FM-13 | P1 | Share invite | Share sheet | Message contains CareMate invite link/token text. |
| FM-13b | P2 | Shared invite link opened on another device | Open generated invite URL | Record current behavior: invite link may not complete an in-app redeem flow automatically; no crash or broken navigation. |
| FM-14 | P1 | Guest | Family entry | Blocked with sign-in. |
| FM-15 | P1 | Airplane mode | Create household + kids | Saves locally; syncs when back online. |
| FM-16 | P2 | Not a parent path | “Not right now” | Returns to Family without forcing kids. |

---

## 7b. Premium / billing

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| PM-01 | P1 | Signed-in | Open Premium | Current tier badge/state and pricing options load. |
| PM-02 | P1 | Signed-in, no household | Choose Family plan | App prompts user to set up family before family checkout. |
| PM-03 | P1 | Signed-in, household exists | Choose Family plan | Family plan selection is allowed and checkout path can start. |
| PM-04 | P1 | Signed-in | Choose Personal plan and tap NGN/USD checkout | Hosted checkout is attempted; failures are shown as user-facing errors, not crashes. |
| PM-05 | P2 | Guest | Open Premium and try upgrade CTA | Guest is routed to login/sign-in path. |
| PM-06 | P2 | Any | Premium screen copy/state | Treat as informational only: premium entitlements may not yet hard-gate most app features. |

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
| AP-01 | P0 | Any | Open Apps | All 5 mini-apps listed with icons. |
| AP-02 | P0 | Any | Open each mini-app | Each opens its home screen without crash. |
| AP-03 | P2 | Coming soon flag (if any) | Tap disabled card | Cannot open / shows coming soon. |

---

## 10. Medication Tracker

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| MD-01 | P0 | Any | Apps → Medication Tracker | Dashboard opens. |
| MD-02 | P0 | — | Add medicine → Name, dosage, once daily, start today → save | Appears in list; today’s dose slot shown. |
| MD-03 | P0 | Add medicine screen | See **Is this for a kid?** | Field visible with No / Yes options **above** name/dosage. |
| MD-04 | P0 | Family kids exist | Yes — for a kid → select child → save | Medicine shows child name on list/doses. |
| MD-05 | P1 | No family kids | Yes — for a kid | CTA to set up / open Family; cannot save for kid without selection. |
| MD-06 | P1 | Guest | Yes — for a kid | Sign-in / family setup messaging. |
| MD-07 | P0 | Due dose today | Tap dose row | Marks taken; tap again undoes. |
| MD-08 | P1 | Twice / three times daily | Add & view today | Correct number of slots/labels. |
| MD-09 | P1 | As needed | Log multiple doses same day | Allowed. |
| MD-10 | P1 | Filter chips | After kid meds exist | All / You / child filters work. |
| MD-11 | P1 | Edit medicine | Pause / remove | Pause hides from active today; remove clears logs. |
| MD-12 | P1 | Log dose modal | Pick medicine/date/slot → save | Log recorded. |
| MD-13 | P1 | Offline | Add + log doses | Works offline. |

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
| PG-01 | P0 | Fresh | Setup pregnancy (due date / LMP per UI) | Tracker shows week/progress. |
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

---

## 15. UI / navigation / regression

| ID | P | Pre | Steps | Expected |
|----|---|-----|-------|----------|
| UI-01 | P1 | Light & dark | Toggle theme | Text readable; no clipped critical CTAs. |
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

## Out of scope / known gaps (do not fail unless regression)

| Area | Note |
|------|------|
| Bookmark toggle on Learn cards | Often decorative; bookmarks screen may be empty |
| Provider map | Placeholder, not full maps SDK |
| Emergency QR | Preview; may not encode real QR yet |
| Biometric unlock | Preference exists, but full app-lock enforcement may not be wired |
| Push notifications | Preference toggle may not deliver OS pushes yet |
| Premium gating | Pricing and checkout UI exist, but most feature locking may still be soft/incomplete |
| Family invite links | Share/invite text exists, but deep-link redemption may not be fully wired |
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
