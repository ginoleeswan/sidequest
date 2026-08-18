# Last Call — Product & Technical Spec

> The backlog app that tells you what you can *actually finish* before you lose access to it.

**Status:** draft v0.1 · supersedes the original ARCADE positioning ("a video game database search engine")

---

## 1. Thesis

A game backlog is not a list. It is a **scheduling problem under deadlines**.

Existing tools each hold one piece and none hold the whole:

| Tool | Knows | Doesn't know |
|---|---|---|
| Backloggd | what you've played | how long you have |
| HowLongToBeat | how long games take | your calendar |
| Game Pass / PS Plus apps | what's in the catalogue | whether you can finish any of it |

Last Call joins them and answers one question no app currently answers:

> **Can I actually finish this before I lose access to it?**

The output is not a list. It is an **ordered play schedule** — start this now, then that, drop the rest, you were never getting to them.

## 2. The user and the moment

The target user subscribes to a game service *intermittently* — buys a month, binges, cancels. They have more backlog than time and no way to reason about the tradeoff.

The triggering moment is concrete and recurring:

> *"My Game Pass lapses on the 3rd. I play maybe 6 hours a week. What can I finish, and in what order?"*

This is a **monthly ritual**, not a daily habit. The product cadence must match: renew → plan → play → lapse → receipt.

## 3. Core model

```
Title          id, name, art, releaseDate            (RAWG)
Duration       hoursMain, hoursCompletionist         (IGDB game_time_to_beat)
Window         startsAt, expiresAt, source           (user-declared sub window, or catalogue data)
Velocity       hoursPerWeek                          (measured via Steam, else self-reported)
Progress       hoursPlayed                           (Steam playtime, else manual)
Entry          Title + Window + priority             (a game in your queue)
Schedule       ordered [Entry] + dropped [Entry]     (scheduler output)
```

A `Schedule` must be **serialisable and time-indexed** — see §7. This is a hard constraint from the widget surface, not an implementation detail.

## 4. The scheduler

### 4.1 Baseline — exact and optimal

Maximising the number of games finished before their deadlines, given you can only play one at a time, is single-machine scheduling to **minimise tardy jobs**: `1‖∑Uⱼ`.

**Moore–Hodgson (1968)** solves this optimally in `O(n log n)`:

1. Sort entries by deadline ascending.
2. Accumulate into the schedule, tracking cumulative hours.
3. When cumulative hours exceed the current entry's deadline, evict the **longest** job scheduled so far.
4. Evicted jobs are the "you won't finish these" set.

The eviction rule is what makes it optimal rather than greedy-and-hopeful, and it produces the product's distinctive voice: the app names what to abandon.

### 4.2 Degradations (planned, not accidental)

| Extension | Complexity class | Approach |
|---|---|---|
| User weights games by desire | `1‖∑wⱼUⱼ` — **NP-hard** | pseudo-polynomial DP over weight |
| Games enter catalogue on different dates | `1\|rⱼ\|∑Uⱼ` — **NP-hard** | heuristic / approximation |

This progression — exact optimum, principled retreat to DP, then approximation — is deliberate. It is the engineering narrative of the project.

### 4.3 Required behaviours

- Unknown duration must degrade gracefully, never silently drop an entry.
- Partial progress (`hoursPlayed`) reduces remaining cost.
- The scheduler is **pure**: `(entries, velocity, now) -> Schedule`. No I/O, fully unit-testable. This is the most tested module in the codebase.

## 5. Surfaces

### 5.1 Widget (primary surface)

The app's success metric is *the user closing it and playing something*. Engagement is an anti-metric. The widget delivers the answer without demanding attention in return.

| Size | Content |
|---|---|
| Small | one decision — art, title, `9 days left`, hours-done/needed ring |
| Medium | next game + queue behind it |
| Large | full schedule as a timeline |
| Lock screen | circular days-remaining ring; inline `Pentiment · 9d` |
| Live Activity *(v2)* | in-session: `2h 14m played · 6h to beat` |

**Urgency gradient:** calm → amber → red as the window closes. On crossing into infeasible, the widget states it plainly — *"You won't finish Starfield. Dropped."*

### 5.2 App

Configuration console behind the widget, not the main event.

- **Plan** — declare your window, set velocity, pick candidates
- **Schedule** — the timeline, reorderable, with dropped games shown and justified
- **Detail** — game metadata (reuses existing ARCADE detail screen)
- **Receipt** — end of window: what you finished, cost per completed game

### 5.3 Notifications (deliberately sparse)

- Sunday planning nudge — "6 hours this week. Finish Pentiment."
- Deadline alert — only when actionable: "3 days left, 4 hours needed."
- Infeasibility alert — "You can't finish this. Drop it?"

## 6. Data sources

| Need | Source | Standing |
|---|---|---|
| Metadata, art | **RAWG** | official; already integrated; requires attribution |
| Hours to beat | **IGDB** `game_time_to_beat` | official (Twitch); partially stubbed in existing code |
| Measured velocity + progress | **Steam Web API** `GetOwnedGames` | official, free; `playtime_forever`, `playtime_2weeks` |
| Subscription window | **user-declared** | zero dependency — the v1 unlock |
| Per-game catalogue expiry | *none official* | ⚠️ deferred to v2; see §9 |

**Key scoping decision:** deadlines come from the user's own subscription window, not from platform catalogue data. This makes v1 shippable on official APIs alone with no scraping.

## 7. Architecture

```
┌─────────────────────────────┐
│  React Native (Expo SDK 57) │
│  ├── data layer (RAWG/IGDB/Steam)
│  ├── scheduler  (pure, tested)
│  └── writes ──► Schedule timeline (JSON)
└──────────────┬──────────────┘
               │  App Group (iOS) / DataStore (Android)
               ▼
┌─────────────────────────────┐
│  Widget extension (native)  │
│  iOS: SwiftUI + WidgetKit   │
│  Android: Glance/RemoteViews│
│  READ ONLY — never computes │
└─────────────────────────────┘
```

### 7.1 The timeline insight

WidgetKit's `TimelineProvider` asks for an array of **future-dated entries**, each rendering at a given date. A `Schedule` is deterministic over time — once computed, every future day's display is known.

**The scheduler's output is already a widget timeline.** Emit N daily entries in one pass; the widget renders for weeks with zero reloads. This sidesteps WidgetKit's reload budget entirely by pre-answering every future question.

### 7.2 Consequences

- The widget **cannot compute**. All logic runs in JS; the widget only renders.
- Requires an **Expo config plugin** to inject native targets (`/ios`, `/android` are generated, not committed).
- **Ends Expo Go** — development builds via EAS or local prebuild from here on.
- Candidate tooling to verify before committing: `@bacons/apple-targets` (iOS), `react-native-android-widget` (Android).

## 8. Build stages

**v0.1 — foundation**
Expo SDK 57 / React 19 / TypeScript / expo-router migration. Secrets to env. Dead deps removed. Existing card + detail UI ported.

**v0.2 — the algorithm**
Pure scheduler module with full unit tests. Moore–Hodgson. Timeline serialisation format fixed.

**v0.3 — the app**
Plan / Schedule / Receipt screens. IGDB durations. Manual velocity.

**v0.4 — the widget**
Config plugin, App Group, iOS small + medium. The centrepiece.

**v1.0**
Steam connect for measured velocity. Android widget. Notifications.

**v2**
Per-game catalogue expiry ingestion. Weighted scheduling (DP). Live Activities.

## 9. Risks

1. **Velocity is only measurable on Steam.** Game Pass/PSN users self-report and will overestimate. *Mitigation:* learn the rate from Steam, apply it across platforms, let users correct.
2. **`game_time_to_beat` coverage is uneven** — strong on major releases, patchy in the long tail. Requires a real "unknown duration" state.
3. **Catalogue expiry has no official source.** Deferred out of v1 entirely rather than faked.
4. **Two native surfaces for one feature.** SwiftUI *and* Kotlin. Real cost, accepted deliberately — this is the work that differentiates the project.
5. **Narrow audience** — intermittent subscribers with backlogs. Accepted: a sharp unserved need beats a broad served one.

## 10. Carried over from ARCADE

Not a rewrite. `GameCard`, `GameCardWide`, `GameInfoCard`, the carousel, the scroll-collapsing animated header and the detail screen all survive. RAWG demotes from *the product* to *the metadata layer*. The commented-out IGDB call in `GameInfoScreen.getIGDBInfo()` becomes load-bearing.

The name does not survive. "Arcade" says *browse*; the entire point of this product is that it refuses to let you browse.
