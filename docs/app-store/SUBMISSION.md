# App Store submission — v1.0.0

The audit of what stood between the repo and a submitted build, what
this branch fixed, and the runbook for the Mac session that finishes it
in App Store Connect. Everything Apple asks for is either in this folder
or named here with where it comes from.

Identity, for reference everywhere below:

|                    |                                                                |
| ------------------ | -------------------------------------------------------------- |
| App name           | Sidequest (see "Name" — may need a suffix)                     |
| Bundle ID          | `com.glstudio.sidequest`                                       |
| Widget extension   | `com.glstudio.sidequest.widget`                                |
| App Group          | `group.com.glstudio.sidequest`                                 |
| Team               | `A85929B4HV`                                                   |
| EAS project        | `3a9dd675-5fbe-4ee3-a12c-2137d1ea9f12` (`gl-studio/sidequest`) |
| Version            | 1.0.0 (build number: EAS remote, auto-increment)               |
| Associated domain  | `gosidequest.vercel.app`                                       |
| Privacy policy URL | https://gosidequest.vercel.app/privacy                         |
| Support URL        | https://gosidequest.vercel.app/support                         |
| Marketing URL      | https://gosidequest.vercel.app                                 |

## 1. The audit

### Fixed on this branch

| Guideline / requirement                                                                          | Was                                                                                                                                                                                                | Now                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **5.1.1(v) Account deletion** — any app with sign-in must let the user delete the account in-app | No way to delete an account; a comment on the Account screen said it was needed                                                                                                                    | `Account → Delete account → Delete for good`. `supabase/migrations/0004_delete_account.sql` adds `delete_account()`, a SECURITY DEFINER function that deletes the caller's own `auth.users` row; the schema cascades everything else. `useAuth().deleteAccount` calls it, signs out locally, clears the cache and sync cursor. Tested. **The migration must be applied to the live project before review** (step 2 below). |
| **5.1.1(i) Privacy policy** — must be accurate and linked in the app and in ASC                  | `/privacy` said "no accounts, no sign-in, no sync"; all three exist                                                                                                                                | Rewritten to name everything that leaves the device: sign-in providers, what syncs, EU hosting on Supabase, deletion, Steam, game-data proxies, crash reports, calendar/notifications, sharing, hosting logs, children. The App Privacy answers in `listing.md` are derived from it.                                                                                                                                       |
| Terms of use                                                                                     | Described a "site", no account terms                                                                                                                                                               | Covers app and site, accounts, deletion, third-party data.                                                                                                                                                                                                                                                                                                                                                                 |
| **Support URL** with contact info                                                                | None — About is a landing page with no way to reach anybody                                                                                                                                        | New `/support` page: GitHub issues, X, LinkedIn, plus the four questions a reviewer or user hits first. Linked from the footer, in the sitemap, and in the a11y run.                                                                                                                                                                                                                                                       |
| **1024×1024 icon without alpha**                                                                 | `assets/icon.png` has transparent rounded corners. Expo flattens it onto white, and Apple's corner mask is larger than the plate's, so the installed icon showed white slivers at all four corners | `assets/icon-ios.png` — same plate and mark, full-bleed, no alpha — generated by `scripts/brand-assets.mjs` and set as `ios.icon` in `app.json`. Android and web keep the rounded one.                                                                                                                                                                                                                                     |
| `eas submit` profile                                                                             | Empty                                                                                                                                                                                              | Team ID, `metadataPath` for EAS Metadata, and a placeholder for the ASC app id (filled once the app record exists, step 4).                                                                                                                                                                                                                                                                                                |
| Store listing copy                                                                               | None                                                                                                                                                                                               | `store.config.json` (EAS Metadata format) and `listing.md` (the same, readable, plus the questionnaires).                                                                                                                                                                                                                                                                                                                  |

### Already in place (verified, nothing to do)

- Sign in with Apple is offered alongside Google (guideline 4.8).
- Sign-in unlocks nothing; the app is fully usable signed out, so no demo account is required (review notes say so).
- Calendar permission has a purpose string (`expo-calendar` plugin writes `NSCalendarsFullAccessUsageDescription` and the legacy key). Notifications are local only, requested on use, no APNs.
- `ITSAppUsesNonExemptEncryption = false`: no export-compliance prompt per build.
- No tracking, no ads, no analytics SDK: no ATT prompt, `NSUserTrackingUsageDescription` not needed.
- Privacy manifests: Expo SDK 57 aggregates `PrivacyInfo.xcprivacy` from every module during prebuild; no third-party SDK outside Expo/Supabase/Google Sign-In is in the binary.
- Universal links: AASA is served from `/.well-known/apple-app-site-association` with the right content type; `associatedDomains` is in `app.json`. Contract-tested.
- Widget extension is declared in `targets/widgets`; EAS Build provisions the extra bundle id and the App Group when it sees the target.
- Native has been run on a device through the September builds (see git log 3–5 Sep); the widgets were verified on device then.
- CI: typecheck, lint, format, 1372 tests, tz tests, a11y, perf budgets — all green on this branch.

### Outside the repo — must be done before submitting

These are the actual blockers now. All are console work, none is code.

1. **Apply migration 0004** to the Supabase project (`kcefulsgjqiqrupxllsn`). Without it, "Delete for good" fails with "function not found" and the reviewer sees a broken deletion, which is a guaranteed rejection.
2. **Deploy `main` to Vercel** after merging, so `/privacy` and `/support` are live at the URLs the listing gives.
3. **Supabase SMTP** — "Confirm email" is on and the shared sender is rate-limited. If the reviewer tries the email link and nothing arrives, that is a rejection. Either configure SMTP (Resend/Postmark/Brevo — Brevo is already connected to this account) or accept that email sign-in may not be demonstrable and say so in the notes. Recommended: configure it.
4. **Google OAuth consent screen** is in testing mode: only listed test users can sign in. Publish it, or Google sign-in fails for the reviewer.
5. **Supabase redirect URLs** must include `sidequest://you` (they do per `docs/auth-setup.md`; confirm).
6. **EAS environment variables** for the `production` environment: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Check with `eas env:list --environment production`. A build without the first two ships the "No account in this build" variant, which is a legal build but not the one the listing describes.
7. **Vercel production env** has `STEAM_API_KEY`, `STEAMGRIDDB_API_KEY`, `TWITCH_CLIENT_ID/SECRET`, `RAWG_API_KEY` (they're live today; confirm nothing rotated).
8. **The name.** "SideQuest" is an established VR app store with its own iOS app. App Store names must be unique across the store. If "Sidequest" is refused when creating the app record, use one of: `Sidequest: Finish Your Games` (28), `Sidequest – Backlog Planner` (27), `Sidequest: Game Backlog` (23). The in-app name and bundle id do not change.
9. **Age rating**, **App Privacy**, **screenshots** — all filled in ASC; answers and a capture script are in this folder.

### iPad

`supportsTablet: true` means the app is reviewed on an iPad, iPad screenshots (13") are mandatory, and — because Expo writes all four `UISupportedInterfaceOrientations~ipad` whenever tablets are on and `requireFullScreen` is off — the app rotates and runs in Split View and Slide Over. So the iPad layout is not a checkbox; it is what the reviewer sees first.

What ships:

- **The wide layout, on native.** The web already had a "desk" layout — the two-column game page with its rail, the plan's dials side by side, the four-up library, the home stage with the hero art — but `useBreakpoint` denied it to native, so an iPad drew the phone page in a 720-point column. The breakpoint now separates _layout_ (`isExpanded`: is there room for two columns — true on a desk and a tablet) from _chrome_ (`isDesk`: is there a sidebar — web only). Every page keeps its wide layout on a tablet; every chrome decision (top bar vs. back button, clearance, footer inset) reads the desk flag, so the native tab bar and stack stay in charge.
- **A tablet shell.** `DesktopShell` renders a `TabletShell` off the web: the same padded column the wide pages were drawn for, and on tab roots one row of chrome the tab bar cannot carry — the wordmark, the search field (Home), and You. No sidebar, no sheet. Pushed screens (game, You) get the column only; their back button already floats over the hero.
- **Browse on the tablet home.** The desk browses from the sidebar. The tablet home gets the phone's Browse rail under the stage instead, so every section is one tap away.
- **Threshold.** Native goes wide at 800 points (`BREAKPOINTS.tablet`): every iPad in portrait except the mini, and every iPad in landscape. The mini in portrait and a Split View pane keep the phone layout, which they are the size of. Rotation re-lays the page (everything reads `useWindowDimensions`).
- **Short pages find the floor.** The native scroller now grows to the viewport, so a footer pins to the bottom of Import, Account and the legal pages instead of floating mid-screen with empty ground under it.

How to look at it without a Mac: `EXPO_PUBLIC_PREVIEW_TABLET=1 npx expo export --platform web --clear --output-dir dist-ipad && npm run shots:ipad` renders every screen at every iPad size (both orientations) into `e2e/ipad-shots/`. It is react-native-web in Chromium, so it shows the layout, not UIKit's chrome — the simulator run in step 5 confirms the rest.

### Decisions to make (defaults chosen; change if you disagree)

- **Age rating.** The app shows third-party artwork, screenshots and trailers for every game on RAWG, which includes M-rated titles. The honest answers (infrequent/mild across violence, mature themes, profanity, suggestive content) land at 12+ under the old scheme and 13+ under the 2025 questionnaire. Under-rating and being caught is worse than 13+.
- **Categories.** Primary Entertainment, secondary Utilities. "Games" is for games only and would be rejected.
- **Pricing.** Free, all territories, no IAP.
- **Release.** Manual release after approval (`automaticRelease: false`), so the Vercel deploy and the widgets can be checked one more time on the store build before it goes live.

## 2. Runbook for the Mac session

Prerequisites on the Mac: Xcode 26 with the iOS 26 simulators, `eas-cli` ≥ 16 (`npm i -g eas-cli`), signed in to Expo (`eas whoami`) and App Store Connect in the browser as the team's Account Holder or Admin.

### Step 1 — Land the code

```sh
git fetch origin
git checkout main && git merge --no-ff origin/claude/app-store-submission-prep-cb7xz8
git push origin main
```

Vercel deploys `main`. Confirm https://gosidequest.vercel.app/privacy and `/support` render before going further.

### Step 2 — Server side

```sh
# Apply the deletion function to the live project.
supabase link --project-ref kcefulsgjqiqrupxllsn   # once
supabase db push
```

Or paste `supabase/migrations/0004_delete_account.sql` into the SQL editor. Then, in the Supabase dashboard: Authentication → SMTP (set a real sender) and confirm the redirect URL list. In Google Cloud (`sidequest-506413`): OAuth consent screen → Publish.

### Step 3 — Build

```sh
eas env:list --environment production        # the four EXPO_PUBLIC_ vars must be here
eas build --profile production --platform ios
```

First time only, EAS will ask to create the distribution certificate and two provisioning profiles (app + widget extension) and to register the App Group; answer yes to all. `requireCommit` is on, so the tree must be clean. The build takes about 20 minutes on `m-medium`.

### Step 4 — Create the app record

In App Store Connect → Apps → **+** → New App: iOS, name (see "The name"), primary language English (U.S.), bundle id `com.glstudio.sidequest`, SKU `sidequest-ios`, full access. Copy the numeric **Apple ID** from App Information into `eas.json` → `submit.production.ios.ascAppId`, commit, push.

### Step 5 — Upload and TestFlight

```sh
eas submit --profile production --platform ios --latest
```

Wait for processing (10–30 min; the email says "completed processing"). Install through TestFlight on a real phone and walk this list — it is the list the reviewer walks:

- [ ] Launch, home, search, a game page, save a game
- [ ] The Plan: set pace, Tonight fills in, week and month draw
- [ ] Connect Steam with a public profile; import
- [ ] You → Account → Continue with Apple; sync status goes to SYNCED
- [ ] Account → Delete account → Delete for good: toast, signed out, library still there; signing in again with Apple creates a fresh, empty account
- [ ] Email link: arrives, opens the app on You, signed in
- [ ] Google sign-in
- [ ] Add all four widgets; Lock Screen widget; tap-through opens the right screen
- [ ] Calendar: grant, evenings appear in a "Sidequest" calendar; deny path says something sensible
- [ ] Reminder: schedule one, it fires
- [ ] Universal link: tap a `gosidequest.vercel.app/game/3498` link in Notes — opens the app
- [ ] Memcard share produces an image
- [ ] Kill and relaunch: nothing lost
- [ ] iPad, both orientations: the wide layout on Home, Library, Plan, a game page and You; the brand bar with search on Home; rotate mid-page; Split View at half width falls back to the phone layout

### Step 6 — Screenshots

`scripts/store-screenshots.sh` boots the two simulators Apple's required sizes come from (iPhone 17 Pro Max → 6.9", iPad Pro 13-inch (M4) → 13"), cleans the status bar, deep-links to each screen and captures. It needs a Release build on the simulator first:

```sh
npx expo run:ios --configuration Release --device "iPhone 17 Pro Max"
npx expo run:ios --configuration Release --device "iPad Pro 13-inch (M4)"
./scripts/store-screenshots.sh
```

Seed the library first (save six or so games and set a pace) — an empty Plan is not a screenshot. The widgets are the best marketing asset the app has: add one to the simulator's Home Screen and capture it by hand with `xcrun simctl io booted screenshot widgets.png`. Output lands in `docs/app-store/screenshots/<device>/`, git-ignored.

Upload order in ASC (6.9" and 13" slots, up to 10 each): tonight, plan, widget, library, game, memcard.

### Step 7 — Fill in App Store Connect

Two ways. Both are described in `listing.md`, which is the source of truth for every field.

**a) EAS Metadata (fast, preview feature).** With `ascAppId` filled in:

```sh
eas metadata:push
```

It writes the listing text, URLs, categories, review contact and notes, and the age-rating advisory from `store.config.json`. It does not upload screenshots. Fill the two `REPLACE_WITH_…` fields in `store.config.json` (review contact email and phone) before running it. If Apple's newer age-rating questionnaire rejects the advisory block, delete `advisory` from the file, push again, and answer the questionnaire in the browser.

**b) By hand in the browser,** section by section from `listing.md`: App Information, Pricing and Availability, App Privacy, then the 1.0 version page (screenshots, description, keywords, support/marketing URLs, promotional text, build, age rating, copyright, App Review contact and notes, version release: manual).

Either way, finish in the browser with: App Privacy (`listing.md` §3, cannot be pushed by EAS), Age Rating questionnaire (§4), Pricing (Free, all territories), Content Rights ("contains third-party content" → yes, rights held under the APIs' terms), and attach the processed build to version 1.0.

### Step 8 — Submit

Add for Review → Submit. Typical first review is 24–48 hours. If rejected, the two usual causes for an app shaped like this are a reviewer who could not sign in (check steps 2.3 and 2.4) and metadata that does not match the binary (the Steam vanity in the notes must be a real public profile).

## 3. After approval

- Release the version manually in ASC.
- `eas update --channel production --message "1.0.0"` is **not** needed for the first release — the binary carries its own bundle. It matters for every JS-only fix afterwards; see `.eas/workflows/publish-update.yml` for why.
- Tag it: `git tag v1.0.0 && git push --tags`.
- `docs/auth-setup.md`: the Apple web secret expires 19 Feb 2027. Put it in a calendar.
