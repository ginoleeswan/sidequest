<h1 align="center">🎮 SIDEQUEST</h1>

<p align="center">A video game discovery app built with React Native and Expo, powered by the RAWG database.<br/><em>Responsive from phone to desktop.</em></p>

<p align="center">
  <a href="https://gosidequest.vercel.app">gosidequest.vercel.app</a>
</p>

<p align="center">
  <img alt="Expo SDK 57" src="https://img.shields.io/badge/Expo%20SDK-57-000.svg?style=flat&logo=EXPO&labelColor=f3f3f3&logoColor=000" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6.svg?style=flat&logo=typescript&logoColor=fff" />
  <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
</p>

<p align="center">
  <img src="./docs/screenshots/home.PNG" alt="home" width="30%"/>
  <img src="./docs/screenshots/info-screen.PNG" alt="info screen" width="30%"/>
  <img src="./docs/screenshots/info-screen-about.PNG" alt="info screen about" width="30%"/>
</p>

> **Where this project is heading:** ARCADE (2021) is being resurrected and
> evolved into **Respec** — an app for time-poor gamers that answers _"what can
> I actually finish?"_ The full product spec lives in
> [`docs/PRODUCT.md`](./docs/PRODUCT.md), and validation work in
> [`docs/validation/`](./docs/validation/). This README covers the current
> codebase: a modernised version of the original game-discovery app.

## Stack

- [Expo SDK 57](https://docs.expo.dev/) / React Native 0.86 / React 19
- TypeScript (strict) · [expo-router](https://docs.expo.dev/router/introduction/) file-based navigation
- ESLint + Prettier · CI via GitHub Actions
- [RAWG API](https://rawg.io/apidocs) for game data

## Get started

```sh
git clone https://github.com/ginoleeswan/sidequest
cd sidequest
npm install

# API key (free): https://rawg.io/apidocs
cp .env.example .env   # then paste your key in

npx expo start
```

Open in [Expo Go](https://expo.dev/go), an emulator, or press `w` for web.

### Scripts

| Command                              |                                                        |
| ------------------------------------ | ------------------------------------------------------ |
| `npm run typecheck`                  | TypeScript, no emit                                    |
| `npm run lint`                       | ESLint                                                 |
| `npm run format`                     | Prettier write                                         |
| `npm test`                           | Jest (unit and component)                              |
| `npm run test:hydration`             | builds nothing — runs `e2e/hydration.mjs` over `dist/` |
| `npm run test:a11y`                  | axe (WCAG A/AA) over `dist/`, both widths              |
| `npm run test:icons`                 | every named icon draws from the subset font            |
| `npm run test:perf`                  | 4G + 4x CPU: bytes, FCP, LCP, CLS against budgets      |
| `npm run build`                      | sitemap + static web export into `dist/`               |
| `node scripts/subset-icons.mjs`      | regenerate the Ionicons subset (after adding an icon)  |
| `node scripts/duration-coverage.mjs` | data-source validation (see `docs/validation/`)        |
| `node scripts/brand-assets.mjs`      | regenerate icons, splash and OG card from the mark     |

EAS lives in its own scripts — `build:dev` / `build:preview` / `build:prod`
and `update:preview` / `update:prod` — plus `npm run prebuild` for the
native projects. `scripts/brand-assets.mjs` also writes the splash
wordmark that `plugins/withSplashWordmark` patches into the iOS
storyboard, which is why the two share their size constants.

`test:hydration` and `test:a11y` need a `dist/` from `npm run build`, and a Chromium that
Playwright can launch. Where the installed browser does not match the
Playwright build (a sandbox with its own browsers, say), point at it:

```bash
CHROMIUM_PATH=/path/to/chrome npm run test:hydration
```

## Deploy (Vercel)

The web build is a static export — `vercel.json` is already configured.

1. Import the repo at [vercel.com/new](https://vercel.com/new) (framework
   preset: **Other** — `vercel.json` supplies the build command and output
   directory).
2. Add environment variables in the project settings:
   - `RAWG_API_KEY` = your RAWG key. Server-side only (used by
     `api/rawg-proxy.ts` and `api/preview.ts`) — kept out of the web
     bundle entirely. `EXPO_PUBLIC_RAWG_API_KEY` is only needed for
     native (EAS) builds, which call RAWG directly; the Vercel
     deployment doesn't read it.
   - `STEAM_API_KEY` = your Steam Web API key
     ([steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)) —
     powers Steam connect on The Plan. Server-side only (used by
     `api/steam.ts`), never shipped to the browser. Optional: without it,
     Steam connect shows a friendly "not configured" message.
   - `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` = a Twitch application
     ([dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps)) —
     IGDB authenticates through Twitch, and these power the reported
     time-to-beat figures the plan is built on. Server-side only (used by
     `api/igdb.ts`). Optional: without them every length falls back to
     RAWG's average, which is the behaviour before they are set.
3. Deploy. Dynamic game pages (`/game/123`) are served via the rewrite in
   `vercel.json`.

Or from the CLI: `npx vercel --prod` (after `npx vercel env add RAWG_API_KEY`).

Live at [gosidequest.vercel.app](https://gosidequest.vercel.app).

## Structure

```
src/
  app/          # expo-router routes — (tabs)/, game/[id], about, account
  api/          # typed clients: RAWG, IGDB, Steam, Twitch
  components/   # UI components
  lib/          # the logic: library, scheduler, sessions, auth, widgets…
  hooks/        # useBreakpoint, useTonightPick, usePersistedState…
  constants/    # icon subset, categories
  styles/       # colors, typography, motion, theme
api/            # Vercel serverless functions (proxies, previews, report)
plugins/        # Expo config plugins (splash wordmark)
targets/        # iOS widgets (Swift, via @bacons/apple-targets)
supabase/       # migrations for the optional sync backend
scripts/        # brand assets, icon subset, duration coverage
e2e/            # the browser battery: hydration, a11y, perf, icons
assets/         # fonts, icons, images
docs/           # product spec, validation, screenshots
```

## Author

**Gino Swanepoel** —
[GitHub](https://github.com/ginoleeswan) ·
[Twitter](https://twitter.com/mrginolee) ·
[LinkedIn](https://linkedin.com/in/ginoswanepoel)
