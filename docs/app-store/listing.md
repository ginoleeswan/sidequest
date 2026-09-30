# App Store Connect — every field, ready to paste

Mirrors `store.config.json` (which `eas metadata:push` reads) and adds
the parts EAS cannot push: App Privacy, the age-rating questionnaire,
pricing and content rights. Character limits are Apple's; the counts
here are checked.

## 1. App Information

| Field              | Value                                                                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name (30)          | `Sidequest` — fallbacks if taken: `Sidequest: Finish Your Games`, `Sidequest – Backlog Planner`                                                                            |
| Subtitle (30)      | `Your backlog, minus the guilt` (29)                                                                                                                                       |
| Primary language   | English (U.S.)                                                                                                                                                             |
| Bundle ID          | `com.glstudio.sidequest`                                                                                                                                                   |
| SKU                | `sidequest-ios`                                                                                                                                                            |
| Primary category   | Entertainment                                                                                                                                                              |
| Secondary category | Utilities                                                                                                                                                                  |
| Content rights     | Contains third-party content: **Yes** — game metadata, artwork and video from RAWG, IGDB, Steam, SteamGridDB and Twitch under their API terms, with attribution in the app |
| Age rating         | See §4                                                                                                                                                                     |
| License agreement  | Apple's standard EULA                                                                                                                                                      |
| Privacy Policy URL | https://gosidequest.vercel.app/privacy                                                                                                                                     |

## 2. Version 1.0 page

| Field                  | Value                                                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Promotional text (170) | Connect Steam, see how much time you really have, and get a plan for the games you'll actually finish. Widgets for tonight, this week and the month. |
| Keywords (100)         | `backlog,games,planner,steam,time to beat,widget,gaming,tracker,library,finish,evening,howlongtobeat` (99)                                           |
| Support URL            | https://gosidequest.vercel.app/support                                                                                                               |
| Marketing URL          | https://gosidequest.vercel.app                                                                                                                       |
| Copyright              | 2026 Gino Swanepoel                                                                                                                                  |
| Version                | 1.0.0                                                                                                                                                |
| Version release        | Manually release this version                                                                                                                        |
| Sign-in required       | No                                                                                                                                                   |
| App Review contact     | Gino Swanepoel, phone and email of the ASC account — fill the two `REPLACE_WITH_…` values in `store.config.json`                                     |
| Demo account           | Not required (nothing is gated). Leave blank and rely on the notes.                                                                                  |

**Description (4000):** the `description` field in `store.config.json`, reproduced here so it can be read as prose:

> Sidequest is for the adult who still loves games and has almost no time left for them. You own hundreds. You get forty-five minutes after bedtime. Sidequest tells you what you can actually finish, and gives you permission to let the rest go.
>
> TONIGHT — One decision, made for you: the game that fits the evening you actually have, with how far you are through it and how many evenings are left. Open the app, read one line, go and play.
>
> THE PLAN — Set your pace, or connect Steam and let your real hours set it for you. Sidequest reads how long each game takes and lays your library across the weeks ahead: what fits, what's on the edge, and what was never going to fit — said plainly, so you can drop it without guilt.
>
> CONNECT STEAM — Paste your profile and your library arrives with hours played, so progress and pace are measured instead of guessed. No password, no login through us: Steam's public API only.
>
> MY LIBRARY — A shelf, not a to-do list. Sort games into ahead, playing and finished; add notes, tags, ratings and deadlines; import a CSV; correct any game's length and Sidequest will use your number.
>
> WIDGETS — Tonight's pick on your Home Screen and Lock Screen. This week as an agenda of evenings. The month as a horizon with deadlines drawn as weather. The year as your Memcard. They never go online — the app writes the plan, the widgets read it.
>
> YOUR MEMCARD — Every finished game fills one block on a memory card, stamped ROLL CREDITS. Share the year, or the month, as one image.
>
> ALSO — Evenings written into a calendar of their own, if you want them there · Reminders for a planned evening or a deadline — sparse by design · Trailers, screenshots, live streams and store links for every game · Backlog amnesty: archive the pile in one tap · Works entirely without an account. Sign in only if you want your library and plan on another device; delete the account from the app whenever you like.
>
> Game data from RAWG, IGDB, Steam, SteamGridDB and Twitch.

**What's New (4000):** The first release. Tonight's pick, the plan, Steam connect, the library, widgets for tonight, the week, the month and the year, and your Memcard.

**App Review notes:** the `review.notes` field in `store.config.json`. Replace `REPLACE_WITH_PUBLIC_STEAM_VANITY` with a real Steam vanity name whose game details are public (your own is fine) — the reviewer will paste it.

### Screenshots

| Device slot | Simulator             | Pixels      | Required                            |
| ----------- | --------------------- | ----------- | ----------------------------------- |
| iPhone 6.9" | iPhone 17 Pro Max     | 1320 × 2868 | Yes                                 |
| iPad 13"    | iPad Pro 13-inch (M4) | 2064 × 2752 | Yes, while `supportsTablet` is true |

Six per device, in this order: Tonight (home), The Plan, a widget on the Home Screen, My Library, a game page, the Memcard. No device frames needed; no text overlays needed for v1. `scripts/store-screenshots.sh` captures the in-app ones.

## 3. App Privacy (the "nutrition label")

Answered from `/privacy`. The rule Apple applies: data is "collected" when it leaves the device and is retained by you or a partner beyond serving the request. Everything device-only (library when signed out, sessions, searches, widgets) is not collected. Server logs at Vercel and Supabase are standard hosting and are not declared.

**Do you or your third-party partners collect data from this app?** Yes.

| Data type                                                                                                                                                        | Collected                                                                                     | Linked to the user                   | Used for tracking | Purpose           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------- | ----------------- |
| Contact Info → Email Address                                                                                                                                     | Yes (only when the user signs in)                                                             | Yes                                  | No                | App Functionality |
| Identifiers → User ID                                                                                                                                            | Yes (the account id; the Steam ID if Steam is connected while signed in)                      | Yes                                  | No                | App Functionality |
| User Content → Other User Content                                                                                                                                | Yes (library, plan, notes, tags, ratings, deadlines, corrected lengths — only when signed in) | Yes                                  | No                | App Functionality |
| Diagnostics → Crash Data                                                                                                                                         | Yes                                                                                           | **No** (no identifier in the report) | No                | App Functionality |
| Everything else (Name, Location, Contacts, Photos, Search History, Browsing History, Purchases, Usage Data, Performance Data, Health, Financial, Sensitive Info) | Not collected                                                                                 |                                      |                   |                   |

Notes for the questionnaire's follow-ups:

- "Is this data used for tracking?" — No, for every type. There is no advertising, no analytics, no data broker.
- Sign in with Apple requests the name scope but the app does not store the name; only the token goes to Supabase, which stores the email (or Apple's relay address) and the id. Name is therefore **not** collected.
- Crash data is "not linked to the user's identity": the report carries message, stack, route and viewport, no identifier, no cookie.
- Optional-disclosure: the Steam vanity lookup and the game-data proxies are ephemeral (not retained) and are not declared.

## 4. Age rating

Apple replaced the old questionnaire in 2025; the ASC form now asks about content, capabilities and controls, and outputs 4+, 9+, 13+, 16+ or 18+. Answer it from this table. `store.config.json` carries the same answers in the older `advisory` format for EAS Metadata; if ASC rejects that block, answer in the browser and drop `advisory` from the file.

| Question                                         | Answer          | Why                                                                                                                              |
| ------------------------------------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Cartoon or fantasy violence                      | Infrequent/Mild | Game artwork and trailers                                                                                                        |
| Realistic violence                               | Infrequent/Mild | Screenshots and trailers of M-rated games appear in browse and on game pages                                                     |
| Prolonged graphic or sadistic realistic violence | None            |                                                                                                                                  |
| Profanity or crude humor                         | Infrequent/Mild | Trailers and screenshots may contain it                                                                                          |
| Mature/suggestive themes                         | Infrequent/Mild | Same                                                                                                                             |
| Horror/fear themes                               | Infrequent/Mild | Horror games exist in the catalogue                                                                                              |
| Sexual content or nudity                         | Infrequent/Mild | Artwork only; nothing graphic                                                                                                    |
| Graphic sexual content and nudity                | None            |                                                                                                                                  |
| Alcohol, tobacco, drug use or references         | None            |                                                                                                                                  |
| Medical/treatment information                    | None            |                                                                                                                                  |
| Gambling (simulated)                             | None            |                                                                                                                                  |
| Contests                                         | None            |                                                                                                                                  |
| Gambling (real)                                  | No              |                                                                                                                                  |
| Unrestricted web access                          | No              | Store links open in the system browser, not in-app                                                                               |
| Messaging / chat                                 | No              |                                                                                                                                  |
| User-generated content                           | No              | Shared plans are a link with the plan encoded in it, visible only to whoever holds the link; there is no feed, profile or upload |
| Parental controls                                | No              |                                                                                                                                  |
| Loot boxes / advertising                         | No              |                                                                                                                                  |
| Made for Kids                                    | No              |                                                                                                                                  |

Expected result: **13+** (12+ on the old scale). Do not answer "None" across the board to get 4+; a reviewer opening a game page for a mature title will notice.

## 5. Pricing and Availability

Free. All territories. No in-app purchases. No pre-order. Tax category: default (App Store software).

## 6. Build settings that ASC reads from the binary

| Key                                     | Value                                                                                                  | Source                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `ITSAppUsesNonExemptEncryption`         | false                                                                                                  | `app.json` → no export-compliance question per build                           |
| `NSCalendarsFullAccessUsageDescription` | "Sidequest files your planned evenings and finished games into a calendar of its own, on this device." | `expo-calendar` plugin                                                         |
| Push notifications                      | Not used; local notifications only                                                                     | `expo-notifications`, `enableBackgroundRemoteNotifications: false`             |
| Sign in with Apple                      | Entitlement on `com.glstudio.sidequest`                                                                | `expo-apple-authentication` plugin; App ID configured per `docs/auth-setup.md` |
| Associated domains                      | `applinks:gosidequest.vercel.app`                                                                      | `app.json`                                                                     |
| App Groups                              | `group.com.glstudio.sidequest`                                                                         | `app.json` + `targets/widgets`                                                 |
| Supported devices                       | iPhone (portrait) and iPad (all orientations, Split View)                                              | `app.json`                                                                     |
