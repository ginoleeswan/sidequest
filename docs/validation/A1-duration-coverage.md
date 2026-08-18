# A1 — Duration-source coverage (go/no-go validation)

**Assumption under test:** a usable hours-to-beat figure exists for enough of a
realistic library to power the feasibility engine (see `docs/PRODUCT.md` §9).

**Method:** `scripts/duration-coverage.mjs` samples RAWG's catalogue in three
popularity strata by `added` rank — head (1–120), mid (961–1080), tail
(~6k–8k) — approximating a real Steam library's popular head + indie long
tail. 360 games total. Each candidate source is measured for presence, then
spot-checked for accuracy.

## Source 1 — RAWG `playtime` (run 2026-08-18)

| stratum   | n       | playtime > 0 |
| --------- | ------- | ------------ |
| head      | 120     | 99%          |
| mid       | 120     | 97%          |
| tail      | 120     | 87%          |
| **total** | **360** | **94%**      |

Presence is excellent. Accuracy is not. Spot-check vs. well-known completion
times: fine for linear games (Portal 4h, Firewatch 5h, DOOM Eternal 12h,
Elden Ring 62h) but badly wrong exactly where our audience lives —
**Pentiment 2h (~9 real), Disco Elysium 6h (~21 real), Stardew 13h
(open-ended)**. The field appears to be a rough community average, not a
completion time.

Also observed: RAWG slug `hades` resolves to an unrelated 2016 game —
cross-database matching needs care (match by slug, verify by release year).

**Verdict:** RAWG playtime is a _fallback ordering signal only_. It must not
drive feasibility promises.

## Source 2 — IGDB `game_time_to_beat` (pending credentials)

The script's IGDB leg (slug batch-match → name-search fallback →
`game_time_to_beats` lookup) is built and idle. The 2021 bearer token in the
old codebase is expired (401). To run:

```sh
RAWG_API_KEY=... TWITCH_CLIENT_ID=... TWITCH_CLIENT_SECRET=... \
  node scripts/duration-coverage.mjs
```

Credentials come from an app at https://dev.twitch.tv/console (the 2021 app
likely still exists; generate a new client secret).

## Decision rule

- IGDB TTB coverage ≥ ~80% head+mid and ≥ ~60% tail → **go**: IGDB primary,
  RAWG fallback, explicit "unknown duration" state for the rest.
- Materially below that → the premise needs a rethink (manual entry burden,
  or a different duration source) **before** any product build continues.
