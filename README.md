<h1 align="center">🎮 ARCADE</h1>

<p align="center">A video game discovery app built with React Native and Expo, powered by the RAWG database.</p>

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
git clone https://github.com/ginoleeswan/arcade
cd arcade
npm install

# API key (free): https://rawg.io/apidocs
cp .env.example .env   # then paste your key in

npx expo start
```

Open in [Expo Go](https://expo.dev/go), an emulator, or press `w` for web.

### Scripts

| Command                              |                                                 |
| ------------------------------------ | ----------------------------------------------- |
| `npm run typecheck`                  | TypeScript, no emit                             |
| `npm run lint`                       | ESLint                                          |
| `npm run format`                     | Prettier write                                  |
| `node scripts/duration-coverage.mjs` | data-source validation (see `docs/validation/`) |

## Structure

```
src/
  app/          # expo-router routes (_layout, index, game/[id])
  api/          # typed RAWG client
  components/   # UI components
  styles/       # colors, typography
assets/         # fonts, icons, images
docs/           # product spec, validation, screenshots
```

## Author

**Gino Swanepoel** —
[GitHub](https://github.com/ginoleeswan) ·
[Twitter](https://twitter.com/mrginolee) ·
[LinkedIn](https://linkedin.com/in/ginoswanepoel)
