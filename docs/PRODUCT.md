# Sidequest — Product & Technical Spec

> **Your backlog, minus the guilt.**
> The app that tells you what you can actually finish — and gives you permission to let the rest go.

**Status:** v0.2 · supersedes v0.1 ("Last Call") · repo lineage: this project began as ARCADE (2021), a RAWG database browser

---

## 1. Thesis

A game backlog is not a list. It is a **scheduling problem under scarce time** — and for most adult gamers, an unmanaged source of low-grade guilt.

Existing tools each hold one piece and none hold the whole:

| Tool          | Knows                  | Doesn't know        |
| ------------- | ---------------------- | ------------------- |
| Backloggd     | what you've played     | how long you have   |
| HowLongToBeat | how long games take    | your calendar       |
| Steam         | your library and hours | what to do about it |

Sidequest joins them and answers the question none of them can:

> **"I have limited time and too many games. What do I actually play?"**

In RPG terms: you have a finite pool of points and they're badly allocated. The app respecs them.

## 2. The user

Not "completionists" and not "subscription churners" — those are subsets. The core identity is broader and culturally live:

> **An adult who still loves games and has almost no time left for them.**
> "I'm 34, I get 45 minutes after bedtime, and I own 400 games."

This is r/patientgamers. It is most paying gamers over 25. The tension is real, unserved, and — critically — an identity people _already claim_.

### 2.1 Emotional stance: relief, not discipline

The guilt already exists; the app doesn't create it, it **dissolves** it. Sidequest never says "you failed." It says _"you were never going to get to these eleven — and that's fine. Here are the two you'll actually love finishing."_ Permission to drop is the product's voice. This stance is load-bearing: it drives copy, notifications, and the share artifact.

### 2.2 Anti-metric

Sidequest's success is the user **closing it and going to play**. Engagement is an anti-metric. This is why the widget is a first-class surface (§6) and why notifications are deliberately sparse.

## 3. The wedge: Connect Steam

v0.1's onboarding (declare a window, set velocity, pick candidates) was three forms before any value. Dead on arrival. The replacement:

> **Connect Steam. That's it.**

Steam's Web API (`GetOwnedGames`) returns the library, `playtime_forever`, and `playtime_2weeks` — which means Sidequest knows the user's **measured velocity** and **actual per-game progress** with zero questions asked. Joined to duration data, the first screen can immediately say:

> _"You play ~4.5 hours a week. Of your 312 games, here are 3 you can actually finish this month — and you're 60% through one already."_

Zero setup, instant insight, and it tells the user something about themselves they didn't know. Subscription windows (v0.1's front door) demote to a power-user feature users graduate into.

## 4. Core model

```
Title      id, name, art, releaseDate              (RAWG)
Duration   hoursMain, hoursCompletionist           (IGDB game_time_to_beat; RAWG playtime fallback)
Velocity   hoursPerWeek                            (measured via Steam; self-reported elsewhere)
Progress   hoursPlayed                             (Steam playtime; manual elsewhere)
Window     startsAt, expiresAt, source             (optional: sub window, release-date deadline, custom)
Entry      Title + optional Window + priority
Schedule   ordered [Entry] + dropped [Entry]       (engine output; serialisable + time-indexed — §6.2)
```

## 5. The engine: two modes

### 5.1 Tonight mode (no deadline) — the everyday hook

"What do I play with the time I have?" is a **ranking** problem, not scheduling: fit to session length, already-started bonus, remaining-hours realism. Simple, honest, and what most users touch daily. No algorithm worship here — this mode wins on data quality and voice.

### 5.2 Window mode (deadlines) — the power feature

With deadlines (subscription lapse, a release date, self-imposed), "maximise games finished in time, one game at a time" is single-machine scheduling to minimise tardy jobs: `1‖∑Uⱼ`. **Moore–Hodgson (1968)** solves it optimally in `O(n log n)`; its eviction step _names what to drop_, which is where the product's permission-giving voice comes from.

Planned degradations remain deliberate portfolio narrative:

| Extension              | Complexity          | Approach             |
| ---------------------- | ------------------- | -------------------- |
| Weighted desire        | `1‖∑wⱼUⱼ` — NP-hard | pseudo-polynomial DP |
| Staggered availability | `1                  | rⱼ                   | ∑Uⱼ` — NP-hard | heuristic/approximation |

### 5.3 Shared deadlines (community feature)

Every gamer has a self-imposed deadline: _"clear something before GTA 6 / Silksong."_ Release dates are public and universal — a social hook with **no social graph**: "2,431 people are finishing something before Silksong." Near-zero engineering, real community feeling.

### 5.4 Engine contract

- Pure: `(entries, velocity, now) → Schedule`. No I/O. The most-tested module in the codebase.
- Unknown duration degrades gracefully — surfaced, never silently dropped.
- Output is serialisable and time-indexed from day one (§6.2 depends on it).

## 6. Surfaces

### 6.1 Widget (the soul of the product)

Built as four widgets in one extension, which is the same idea arrived at by scale rather than by size — the three questions the plan page is built on, plus the trophy.

| Widget         | Families                                      | Content                                                                       | Status   |
| -------------- | --------------------------------------------- | ----------------------------------------------------------------------------- | -------- |
| **Tonight**    | small, medium, Lock Screen (rect/circ/inline) | one decision — art, title, hours; the days-remaining ring on the accessories  | built    |
| **This week**  | medium, large, XL                             | the seven evenings as a dated agenda; free evenings drawn as free             | built    |
| **This month** | medium, large, XL                             | the horizon — today, credit flags on their dates, deadline trouble as weather | built    |
| **The year**   | small, medium                                 | the Memcard's twelve months (§7)                                              | built    |
| Live Activity  | —                                             | in-session `2h 14m played · 6h to beat`                                       | v2, open |

Urgency gradient calm → amber → red; on infeasibility the widget says so plainly. The widget is also the marketing asset — a homescreen reading "3 games · 12 days" beats any store screenshot.

The widgets hold no rule the app also holds: which game is tonight's, what colour a game wears, how far back a month remembers, even the date strings are all decided in JS and written flat to the App Group. Where a value must exist twice — the palette, the alert horizon, the container name, the widget kinds — it is pinned by contract tests that read the Swift, because both sides of that boundary are blind to the other's drift.

### 6.2 The timeline insight

WidgetKit's `TimelineProvider` wants future-dated entries. A `Schedule` is deterministic over time — **the engine's output already is a widget timeline.** Compute once in JS, serialise, and the native widget renders for weeks with zero reloads, sidestepping the reload budget entirely. Architecture: RN app computes and writes; native widget (SwiftUI / Glance) is read-only via App Group / DataStore. Requires an Expo config plugin and dev builds (ends Expo Go).

### 6.3 App

Configuration console behind the widget. Built as: **Home** (a storefront personalised by the library) · **My Library** (the shelf, its hours framed as inventory rather than debt) · **The Plan** (tonight, what doesn't fit, this week, this month, and the two dials behind all of it) · **Detail** (ported ARCADE detail screen, and where a game sits in your plan) · **Memcard** (see §7) · **/shared** (somebody else's plan, drawn as a plan).

### 6.4 Notifications (sparse by design)

Sunday planning nudge · actionable deadline alerts only · the honest one ("You can't finish this. Drop it?").

## 7. The share artifact: your Memcard

The community-love mechanism. Steam Replay celebrates volume — a flex only if you have time. Sidequest's year-end (and month-end) artifact celebrates **completion and taste**:

> **2026 · 7 games finished · 94 hours · zero evenings wasted**

Rendered as a **memory card** — each finished game fills one block, stamped **ROLL CREDITS**. Nostalgic, funny, aimed at exactly the people the existing artifact quietly excludes. This is the thing that gets posted.

### 7.1 Vocabulary system

The app speaks fluent gamer front to back:

| Phrase              | Meaning in-app                                                             |
| ------------------- | -------------------------------------------------------------------------- |
| **sidequest**       | a game you can realistically finish in the time you have                   |
| **roll credits**    | finish a game; the completion moment                                       |
| **your Memcard**    | the finished-games shelf; the share artifact                               |
| **backlog amnesty** | one-tap archive of the pile, guilt-free                                    |
| **1CC**             | a perfect month — finished everything planned (and the ARCADE lineage nod) |

## 8. Data sources & validation

| Need                | Source                               | Status                                                                                                                                                                                                    |
| ------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metadata, art       | RAWG                                 | live key; **A1-validated: 94% playtime presence but inaccurate** (Pentiment 2h vs ~9; Disco Elysium 6h vs ~21) → fallback ordering signal only                                                            |
| Hours to beat       | IGDB `game_time_to_beat`             | **pending — the go/no-go.** Script built (`scripts/duration-coverage.mjs`); awaits fresh Twitch credentials. Decision rule in `docs/validation/A1-duration-coverage.md`: ≥80% head+mid and ≥60% tail → go |
| Velocity + progress | Steam Web API                        | official, free; OpenID sign-in is web-native (favours the probe)                                                                                                                                          |
| Windows             | user-declared + public release dates | zero scraping; catalogue-expiry feeds stay deferred (v2+, only if an honest source exists)                                                                                                                |

Matching lesson from A1: cross-database slug matching lies (`hades` → an unrelated 2016 game). Match by slug, verify by release year.

## 9. Build order — probe first

Sequenced so the cheapest signal comes before the most expensive build. The native widget is still the destination; it just isn't a blind bet.

| #   | Step                                                                                                                                                                                                                                                     | Cost            | Status                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------ |
| 0   | Rotate RAWG + IGDB keys (public in git history)                                                                                                                                                                                                          | minutes         | **user, outstanding**                                                                                  |
| 1   | A1 duration-coverage validation                                                                                                                                                                                                                          | ½ day           | done — both legs (IGDB via task #27)                                                                   |
| 2   | Foundation: Expo SDK 57 / React 19 / TS / expo-router migration; secrets to env; dead deps out; card + detail UI ported                                                                                                                                  | ~1 day          | done                                                                                                   |
| 3   | **The probe**: one web page — paste Steam ID → backlog reality check ("312 games · 4.5 hrs/week · **71 years to clear** · you'll finish 3 this year, here they are") as a shareable card. Served from the Expo web target — same codebase, not throwaway | 3–4 days        | superseded — the full web product shipped instead (live on Vercel)                                     |
| 4   | Post to r/patientgamers / r/gamepass; read the signal                                                                                                                                                                                                    | —               | **user, open**                                                                                         |
| 5   | The product: native app, Steam connect, engine both modes, Shelf/Memcard                                                                                                                                                                                 | the real build  | built + sync; awaiting first device run                                                                |
| 6   | The widget: config plugin, App Group, iOS small+medium, then Android                                                                                                                                                                                     | the centrepiece | iOS built — four widgets (§6.1), timeline, urgency, ring; **Swift unverified on device**; Android open |

**Probe scope discipline:** one screen and a share card. The moment it grows settings, kill the scope and move to step 5.

## 10. Monetisation (honesty clause)

This category monetises badly (HLTB: ads; Backloggd: small supporter tier). Plan: free, with a possible $2–3/mo supporter tier later (multi-platform sync, premium widgets). **Built for the portfolio and the love; revenue is a rounding error, not a goal.**

## 11. Risks

1. **IGDB duration coverage unproven** — ~~the open go/no-go~~ resolved: validated end to end (task #27), wired behind `api/igdb`.
2. **Velocity measurable only on Steam** — elsewhere self-reported and overestimated. Mitigate: learn from Steam, apply cross-platform, allow correction.
3. **Guilt reading** — "drop it" can land as nagging if the copy slips. The relief stance (§2.1) is a hard requirement on all copy.
4. **Two native widget stacks** (SwiftUI + Glance/Kotlin). Real cost, accepted deliberately — it is the differentiating engineering work.
5. **`react-native-web` polish** — largely paid down: desktop layouts, an a11y pass and a data-screen reading check (`test:data`) run in CI. The class of bug it predicted was real — four instances found by rendering and reading the built site.
6. **Name collision, known** — SideQuest is an established VR app store in the Meta Quest ecosystem. "Sidequest" is a working name; it needs a trademark / App Store pass before step 5 bakes it into a bundle identifier.

## 12. Carried over from ARCADE

`GameCard`, `GameCardWide`, `GameInfoCard`, the carousel, the scroll-collapsing animated header and the detail screen all survive into the app. RAWG demotes from _the product_ to _the metadata layer_. The commented-out IGDB call in the old `GameInfoScreen` becomes load-bearing. And the name carries the thesis: for an adult with a job, gaming _is_ the side quest — and side quests were always the best part.
