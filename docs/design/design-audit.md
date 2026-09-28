# Sidequest design audit

_September 2026. The native phone app (iOS/Android, compact layout) first;
the desk and web layouts only where they share code. This follows on from
[`native-texture-audit.md`](./native-texture-audit.md), which covered
surface, grain and shadow, and is not repeated here._

**Method.**

- **Four reviews:**
  - Home.
  - The game page.
  - Library, Plan and the secondary pages.
  - A quantified, system-wide sweep of tokens, targets, feedback and
    accessibility, with every count coming from a grep or a script.
- **Checked by hand:** every P0 below was re-checked against the source.
  Those rows are marked ✔︎.
- **Screenshots:** from a local web build at iPhone size. The native
  build could not run in this environment, so native-only claims come
  from the code.

---

## The verdict

The ideas are top tier. The execution isn't yet.

**What's already top tier:**

- **A real product point of view.** Hours as the currency, "what can I
  actually finish", evenings drawn at their real size, and letting go
  treated as a feature.
- **Copy with a voice.** For example, "Let go. Nothing owed."
- **Signature pieces:**
  - FitStrip.
  - The home stage, with publisher logos and the melt.
  - The quest-card fallback.
  - The shoreline seams.
  - The arcade button.
- **The system itself.** It has tokens, a type scale, motion tokens,
  wide reduced-motion coverage, and a codebase that explains its own
  decisions.

**What stops it reading as a top-tier app:**

1. **The thesis is whispered.** The app's one differentiator is how long
   a game takes and whether it fits your week. That number is set in the
   smallest type on every tile (11pt Regular), sits in the second row of
   the game page, and the game page's "can I finish it?" answer is about
   three screens down.
2. **The colour meanings are declared, then broken.**
   - `colors.ts` gives each colour one job: amber is time, violet the
     evening and the plan, mint finishing, coral letting go.
   - The screens use amber for bookmarks, "#2 in your plan", credits
     flags, checkboxes and finished-year cells.
   - They use mint, amber and coral as a good/ok/bad traffic light on
     ratings.
   - Home never uses violet, mint or coral at all.
3. **Controls don't feel like a native app.**
   - 110 of 127 pressables have no pressed state.
   - Only 20 have a `hitSlop`, and dozens of targets are under 44pt,
     including the header icons at about 29pt.
   - Haptics are called in 4 places.
   - Nothing supports Dynamic Type.
   - Sheets are centred web-style dialogs that the keyboard covers.
4. **The first-run screens are the weakest.** New users land on an empty
   Plan and an empty Library, which are a grey circle, a system icon, a
   14pt title and a button. The error state is the same template with no
   retry.
5. **The system is drifting.** The sweep counted:
   - 258 hard-coded colours, including 14 unnamed near-black "ink" navies.
   - 91 inline font sizes across 28 distinct sizes.
   - `SPACING.sm + 2` used 63 times.
   - 16 icon sizes.
   - 91 literal corner radii.

### Scorecard

| Dimension                      | Grade | One line                                                                                                           |
| ------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------ |
| Product concept & voice        | A     | Distinctive and coherent; the copy is the best thing in the app                                                    |
| Visual identity                | B+    | Strong marks and signature modules. The icon ships with baked-in transparent corners (P0)                          |
| Information hierarchy          | C+    | The number that matters is the smallest thing on screen                                                            |
| Colour system                  | C     | Semantic on paper, violated in practice; violet and coral fail AA on the page ground                               |
| Typography                     | B−    | Good pairing; the scale has half-pixel steps and nothing between 32 and 96; one glyph falls back to a system font  |
| Layout & rhythm                | B−    | Home is one rhythm top to bottom; rails show exactly two tiles with no peek                                        |
| Controls & interaction         | C−    | Little press feedback, small targets, five different selected-state styles                                         |
| States (empty, loading, error) | C−    | Generic empties, dead-end errors, skeletons that don't match the page                                              |
| Navigation & chrome            | C     | A trap on Home's section doors; no title or action stays pinned on a long page                                     |
| Accessibility                  | C     | Wide reduced-motion support, but no Dynamic Type, missing roles, controls VoiceOver can't reach, contrast failures |
| Surface & texture              | B     | After PR #70; blur materials are still missing                                                                     |

---

## P0: visibly broken, fix first

Each of these is a bug a reviewer would call amateur on first use. All
are small.

| #   | Where                                                                              | What's wrong                                                                                                                                                                                                             | Fix                                                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 ✔︎ | `assets/icon.png`                                                                  | The icon has **transparent rounded corners baked in** (44,272 non-opaque pixels). iOS masks the icon itself and fills alpha with black, so it shows dark corner slivers. App Store Connect rejects app icons with alpha. | Flatten onto a full-bleed `#272F3F` square with no alpha and let iOS round it. Add iOS 18 dark and tinted variants while there. Needs a store build.                     |
| 2 ✔︎ | `game/[id].tsx:583, 1818, 2216`; `GameTile:148`; `SearchResult:88`; `TopResult:56` | **"★" isn't in Geom or Noah.** Checked the cmap: no U+2605 in any bundled face. It falls back to the system font, at the wrong weight and baseline, in the game page's loudest row and on every tile.                    | `<Ionicons name="star">` inline, coloured `COLORS.starGold` (currently unused). Also check "→": Geom has no U+2192 either, so use a chevron icon for arrows set in Geom. |
| 3 ✔︎ | `index.tsx:930, 946`                                                               | **Personal rows show as a Top 10.** "More like Hades" and "Because you finished…" spread `DISCOVER[0]`, which carries `variant: 'ranked'`. They get cut to 10 with 52pt numerals 1–10.                                   | Build these sections without `ranked`, for example `{ ...DISCOVER[0], variant: 'wide' }`. That also adds variety.                                                        |
| 4 ✔︎ | `index.tsx:381`                                                                    | **Trending is numbered wrong.** `games.slice(FEATURED_COUNT)` feeds a ranked shelf, so the tile marked "1" is the 6th game.                                                                                              | Offset the rank by `FEATURED_COUNT`, or stop ranking this row.                                                                                                           |
| 5 ✔︎ | `index.tsx:511`, `game/[id].tsx:994`                                               | **Error states are dead ends.** They have no retry, sit outside the scroller (so pull-to-refresh is gone), name a vendor ("Couldn't reach RAWG"), and on Home the icon circle runs under the header.                     | "Can't load games right now" plus a "Try again" button, inside `Screen onRefresh`, padded below the header. Use `alert-circle-outline` when the device isn't offline.    |
| 6 ✔︎ | `Alerts.tsx:198` → `LetGoBar`                                                      | **Letting go can't be cancelled.** After "Let it go" every button removes the game, and the only exit is leaving the screen. The Toast can't carry an Undo (`pointerEvents="none"`).                                     | Add a ghost "Keep it". Give the Toast an optional action (`{ label: 'Undo', onPress }`) that stays for 4s, and reuse it for RecentShelf's "Clear".                       |
| 7   | `index.tsx:447`                                                                    | **Section doors trap you on native.** They swap the tab's content through state: there's no back button, swipe-back does nothing, and Android back leaves the tab.                                                       | `router.push('/browse/' + key)` on native too; the route already exists.                                                                                                 |
| 8   | `GameTile:166/242`, `plan.tsx:188/836`                                             | **VoiceOver can't reach the inner controls.** The tile's save, the Tonight strip's "I have" segments and a row's edit-length action are inside an outer button, so iOS groups them.                                      | Make the outer element a View, add a labelled Pressable for the tile, and make the controls siblings. Add `accessibilityActions` for Save.                               |
| 9   | `Onboarding.tsx:324`                                                               | **Onboarding sets a phantom Steam pace.** It offers 15h, the Plan offers `[2,4,6,8,12,20]`, and it adds a "15h · Steam" chip for someone who never connected Steam. Seven segments then truncate.                        | Offer 4, 8 and 12.                                                                                                                                                       |
| 10  | `library.tsx:748`                                                                  | A stale instruction: "Library → Copy library" now lives in You.                                                                                                                                                          | Change it to "You → Copy library".                                                                                                                                       |

---

## The six big moves

These are ordered by how much they change how the app feels, not by
effort.

### 1. Put the thesis in the loudest type

Hours-to-finish is the product. Today:

- On tiles it's `TYPE.fine` (11pt Regular) on the second line, behind
  the title (`GameTile.tsx:409`).
- On the game page the hours are 24pt in a four-cell strip, while the
  verdict figures three screens down are 34pt (`[id].tsx:2629` vs `:3104`).
- On Home, the signature "Finish it this weekend" row is shrunk to the
  standard tile on the phone (`Shelf.tsx:40`) and starts about 716pt
  down, under the tab bar.

**Recommendations:**

- **Tile anatomy:** hours go on their own first line in `labelSmall` Bold
  amber ("6h"), then the title on up to 2 lines (`minHeight` 34), then one
  meta fact.
  - Drop the platform glyphs on the phone, and with them most of the
    65% black gradient.
  - The tile then carries two overlays (save, score) instead of four.
- **A `TYPE.figure` token** (34/38, −0.6) for every hero number: the game
  page's hours, the Library total (currently hand-set 46/50), You's
  figures and the verdict figures. Secondary cells use `figureSmall`
  (20/24).
- **Game page order on the phone:**
  1. Masthead.
  2. The answer: `said` plus the hours and finish figures at `figure`
     size.
  3. The Decision action.
  4. FitStrip.
  5. Media.
  6. Prose, with the tags inside it.
  7. Details.

  Drop the duplicated finish percentage from the strip (it appears there
  and in the verdict, and the counts a third time in the community line).

- **Home:** move `DiscoverRail` below Trending (or drop it; the search
  screen already has those doors), shorten the compact stage to about
  0.6 of the screen, and render the quick-wins row as the 16:9 `wide`
  variant with the hours set large. The signature row then starts above
  the fold.

### 2. Make the colour meanings true, and legible

Enforce what `colors.ts` already says:

| Colour | Should mean                  | Currently misused at                                                                                                                                                                                                               |
| ------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Amber  | time, and the primary action | saved bookmark (`GameTile:259`), "#2 in your plan" (`[id]:2694`), credits flag (`WeekView:275`), Tidy checkboxes (`tidy:329`), finished-year cells (`YearBlocks:142`), `pinCost` (`plan:1265`), celebration stats                  |
| Violet | the evening, the plan        | missing from the stage's "Tonight" eyebrow (`HomeStage:973`, white) and from today's row in WeekView (amber)                                                                                                                       |
| Mint   | finished                     | used as "good" in the rating traffic light; the third plan colour (`planColours.ts:18`) is mint by position, beside mint "done" stamps; missing from "BECAUSE YOU FINISHED IT" (`SeriesNews:214`) and "YOU SAW THE CREDITS" (grey) |
| Coral  | letting go                   | used as "bad" in ratings, and for the LIVE tag (`LiveStreams:173`, 2.8:1)                                                                                                                                                          |

- **Ratings and Metacritic** move to neutral `lightGrey`. RatingsBreakdown
  becomes one grey ramp at 100/70/40%, with coral only on "skip".
  ScorePill becomes a filled plate `rgba(18,24,36,0.72)`, with colours
  from the palette instead of the off-palette `#6DC849/#FDCA52/#FC4B37`.
- **Saved bookmark:** white, filled.
- **Plan colours:** `[accent, lightGrey, '#7F8AA3']`.
- **Add a `tone` prop to SectionHeader** so eyebrows can speak in their
  colour. That's how Home gets violet and mint at all.
- **Legibility** (✔︎ computed):

  | Colour                    | on `darkGrey`, the page ground | on navy |
  | ------------------------- | ------------------------------ | ------- |
  | violet                    | **4.05**                       | 4.99    |
  | coral                     | **3.92**                       | 4.83    |
  | mediumGrey                | 4.63                           | 5.70    |
  | mediumGrey at 0.8 opacity | 3.55                           | 4.24    |
  - The comment "AA on every surface" is false for small violet and coral
    text on the page. Add `violetText #B0A5FF` and `coralText #FF8A80` for
    text on `darkGrey`.
  - `mediumGrey` sits on the smallest type more than 1,500 times; a
    `textMuted` of about `#B4B9C6` (≥5:1) is safer for 10–11pt.
  - Ban opacity on text.

### 3. One set of controls

**Selected states come in five styles:**

- Chip: solid white.
- FilterBar: white inside a track.
- Segmented: amber.
- Library sort: text colour only.
- Checkboxes: amber.

On Library the two white selected pills are louder than the 46pt amber
total. Chip `solid` has no border while `outline` has 1px, so a chip
shrinks 2pt when you select it.

- **Single-choice** (status, sort, pace): the Segmented or FilterBar
  pattern, with counts ("Playing 3").
- **Multi-choice chips:** `rgba(255,255,255,0.12)` fill, white text, a
  `strokeStrong` border, and the same border width in both states.
- **Amber** stays for the primary action.

**Primary buttons come in four styles:**

| Where              | Fill  | Radius |
| ------------------ | ----- | ------ |
| Decision           | amber | 10     |
| Message            | amber | 30     |
| FinishCelebration  | white | 30     |
| DurationSheet Save | white | 10     |

Make one `PrimaryButton`: amber, radius 10, 48pt tall. Keep
`ArcadeButton` as the single showpiece on the stage.

**Sheets:** DurationSheet and Library's import dialog are centred, fade-in
dialogs, and there is no `KeyboardAvoidingView` in the repo, so the
numeric keyboard covers Save. Make one `Sheet`:

- Pinned to the bottom, with the top corners at 22.
- Slides in on `SPRING.surface`, with a grabber.
- Wrapped in `KeyboardAvoidingView behavior="padding"`.
- Dismissed by swiping down.

**Rows:** the Plan panel mixes three row designs (thumbs 64×40, 44×44 and
56×35) and nests a bordered Alerts panel inside the Plan panel, so text
starts 62pt in. Use one row: a 40×40 art square, title, one meta line, a
trailing slot, and hairline dividers.

### 4. A touch primitive that makes every control feel native

These four gaps have one fix:

| Gap              | Size of it                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No pressed state | 110 of 127 pressables                                                                                                                                                    |
| No role          | 32 pressables                                                                                                                                                            |
| Under 44pt       | header icons about 29pt, BackButton 40, tile save 38, StatusActions segment 37, StoreLinks 33, DurationSheet presets 33, Chip 33–35, 10 inline text links at line height |
| Haptics          | 4 call sites                                                                                                                                                             |

Reduced motion also makes `ScaleButton` return early, so with that
setting on its 13 users give **no** feedback at all.

**One `Touchable` / `IconButton` primitive that:**

- Enforces a 44×44 minimum, adding `hitSlop` automatically when the
  visible size is smaller.
- Requires `accessibilityRole` and a label.
- Has a built-in pressed state (`scale 0.97` for cards, opacity 0.7 for
  text and icons), falling back to opacity alone under reduced motion.
- Takes a `haptic` prop (`selection`, `light`, `success`, `warning`).

Default haptics:

| Interaction                 | Haptic                |
| --------------------------- | --------------------- |
| Save                        | light                 |
| Segmented change            | selection             |
| Arcade button bottoming out | light                 |
| Duration save               | success               |
| Let go                      | warning               |
| Finish                      | success; already done |

Migrate Chip, Segmented, FilterBar, GameTile save, the header icons and
BackButton first. Those are the controls people touch most.

### 5. States that sell the product

Empty, loading and error screens are what new and unlucky users see.
Today they are the most generic thing in the app.

**Empty Plan** (where onboarding lands people, `Onboarding.tsx:449`):

- Draw the WeekView's own dashed "free evening" rows for all seven
  nights.
- A `TYPE.title` line over them: "Seven free evenings. Save one game and
  I'll fill one."
- Buttons: amber "Find something short" and ghost "Import".

**Empty Library:** it currently shows the status chips over nothing and
offers only Import. Instead:

- A 2×2 grid of the dashed AddCell slots (`library.tsx:965`).
- "0h on your shelf" set as the hero figure in mediumGrey.
- "Find a game" as the primary action.

**`Message` itself:**

- Title `TYPE.h2` in white.
- A 48pt glyph in its meaning colour.
- Drop the grey 88pt circle.
- Always pass an action.

**Skeletons** should match the page they stand in for:

- **Home:** the bones leave out the doors row, so the page jumps about
  139pt when it loads. Quick wins are drawn at 220 wide.
- **Game page:** there's an identity bone below the hero, an "About"
  heading that no longer exists, no media bones, and a rounded verdict
  card where the real one is flush.
- **Shelves** should render `SkeletonShelf` while loading instead of
  `null`, so rows stop popping in from zero height and a failed row
  doesn't vanish silently.
- **The pulse** is 0.45↔1 every 700ms, which reads as a flash. Make it
  1.2s per step.

### 6. Chrome that knows where you are

- **Rails:** at 168 + 18 on a 393pt phone the third tile shows 1pt, so
  every rail reads as a fixed two-up grid. Use 150pt tiles with a 12pt
  gap for about a 49pt peek (`Rail.tsx:142`). Nothing else says "this
  scrolls" as cheaply.
- **The Home header** is a 144pt gradient that fogs shelf titles as they
  pass under it. Drive it from `scrollY`: once the stage is gone, make it
  solid navy with a hairline, at row height.
- **The game page (about 3,500pt) keeps nothing pinned.**
  - Past the masthead, `setOptions({ headerTitle: game.name,
headerBlurEffect: 'systemChromeMaterialDark' })`.
  - Slide up a bottom bar with the hours and a 48pt status action.
- **Blur:** plates over artwork (header chips, back pill, StatusActions)
  and sheet backdrops should be real material (`expo-blur`). It's a
  native module, so it needs a store build.
- **Tab bar:** `backgroundColor={COLORS.navy}` may be painting iOS 26's
  Liquid Glass solid. Check on a device. Most likely fix: no colour on
  iOS, and `blurEffect` below iOS 26.
- **Tab identity:** "My Library" and "The Plan" are 19pt light grey, which
  is quieter than the 22pt wordmark above them. Set tab and page titles
  in `TYPE.display` (32) in white, with a two-word eyebrow in the tab's
  colour, and drop the wordmark on tab roots to 17. Page titles are
  currently 19 (Tidy, Memcard), 26 (Account) and 32 (You); unify them.

---

## The system: stop the drift

The sweep found the following; each row pairs a finding with its fix.

| Area         | Finding                                                                                                                                                                                                                                                                                      | Fix                                                                                                                                                                                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colour       | 258 literals. There are 14 unnamed ink navies (for example `9,12,19` ×20, `20,25,35` ×6, `#1D2431`, `#161C27`, `#0B0E15`) and about 100 alpha copies of existing tokens. Near-copies include `#2A3346`/`#2A3348` (≈ surface) and `#CBD1DC` (≈ lightGrey). Seven shadows use `rgba(0,0,0,…)`. | Add `COLORS.ink #090C13`, `inkRaised #161C27` and `inkSurface #1D2431`, plus `alpha(token, a)` and `SCRIM.navy(a)` / `SCRIM.ink(a)`. Add `SHADOW.float`. Lint colour literals outside `src/styles`.                                                                                             |
| Type         | The scale has six steps between 10 and 13 (10/10.5/11/11.5/12/13), half-pixel sizes, `h4` identical to `label`, `h1` unused, and nothing between 32 and 96. There are 91 inline `fontSize`s, 28 distinct sizes, and about 47 places that spread a step and override its size.                | Small steps become 10/11/12/13. Delete 10.5 and 11.5, merge `h4` into `label`, and add `figure` 34/38 and `hero` 44/46. Add `<AppText variant>` with `maxFontSizeMultiplier` per variant (about 1.3 for display and figures, 2 for body). Lint `fontSize`/`fontFamily` outside `typography.ts`. |
| Dynamic Type | There are 0 uses of `maxFontSizeMultiplier`, `allowFontScaling` or `fontScale`. Fixed heights will clip: doors 84, mood cards 108, recent 122, WeekView track 24, HorizonStrip 108. The game strip's `numberOfLines={1}` turns "12.5h" into "12…".                                           | `minHeight` instead of `height`; caps through `AppText`; a 2×2 strip when `fontScale > 1.3`.                                                                                                                                                                                                    |
| Spacing      | `SPACING.sm + 2` appears 63 times, plus `xl*2` ×14, `xl*1.5` ×13 and 189 raw literals (2, 3, 5, 6, 7).                                                                                                                                                                                       | Add `SPACING.xxs 2`, `sm2 10`, `xxl 48` and `xxxl 64`.                                                                                                                                                                                                                                          |
| Radius       | 91 literals with no pill token, and four radii in one scroll on Home (10/22/30/40). Nesting is wrong: a 22 row in a 22 panel with 8pt padding (`plan:1365`), and 30 presets in a 22 sheet (`DurationSheet:186`).                                                                             | Add `RADIUS.xs 4` and `pill 999`, and `innerRadius(outer, inset)`. Use 14 for every card up to 130pt tall.                                                                                                                                                                                      |
| Icons        | 16 sizes. Filled and outline are mixed in the same header (`search` beside `person-circle-outline`).                                                                                                                                                                                         | `ICON = { sm: 14, md: 18, lg: 22, xl: 28 }`. Outline by default; filled only for the selected state.                                                                                                                                                                                            |
| Motion       | Outside the tokens: 2600/2900/1900/1250/620ms, inline springs and `Easing.out(cubic)`. Toast, BeatDeck and StageTrailer ignore reduced motion.                                                                                                                                               | Add `DURATION.ambient`, `STAGGER` and `SPRING.pop`, and put a reduced-motion fallback inside `useAnimatedValue`.                                                                                                                                                                                |

---

## By screen: remaining findings

The P0s and big moves above aren't repeated here.

### Home

- **One rhythm top to bottom.** All 14 blocks use the same 19pt
  light-grey header and the same gap of about 43pt. "BROWSE" is an
  eyebrow with no title; MoodShelf is a title with no eyebrow. Group the
  "for you" rows under a chapter header (`h1` 22pt Geom, 56pt above).
  Give the mood doors a glyph or artwork: today the two door rows are
  near-identical tinted plates.
- **SeriesNews** is inset twice (40pt instead of 20) and touches
  RecentShelf. Remove the extra padding and add `marginBottom: xl`.
- **The billboard's eyebrow** is always "Worth the shelf space". Give it
  a real reason, the way the stage slides have one.
- **Stage dots** are 16pt wide with overlapping hit areas. Give each an
  18pt-wide pressable.
- **Pull-to-refresh** is light grey on the grid (`index.tsx:494`) and
  amber on Home. Use amber everywhere.

### Game page

- **Media:**
  - Trailers sort after every screenshot (`[id]:1076`), though the
    comment says "Trailers first". Lead with the first trailer, using the
    key art as its poster.
  - The lightbox shows one image with no paging or zoom. Make it a
    `pagingEnabled` FlatList with a "3 / 12" counter.
  - The lightbox close sits at `top: 48`, under the Dynamic Island. Use
    `insets.top + 8`, 44×44.
  - Trailers need two taps. Pass `autoPlay` to the lightbox player.
- **Platforms** are buried in the Details band at the foot, but "is it on
  my Switch?" is a go/no-go fact. Add 14pt `PlatformIcons` to the hero
  identity line.
- **Rhythm:** tags sit 40pt from the prose they index; fold them into the
  `about` block. FitStrip is only about 16pt from media; give it
  `paddingBottom: xl`.
- **The two poster rails differ:** Similar uses a hand-built card and
  Series uses `GameTile`. Use `GameTile` for both, and one media radius.
- **The LIVE tag** is white 9pt on coral (2.8:1). Use navy on white, or
  white on `#D93A30`, at `micro` 10.
- **Accessibility:**
  - Screenshots have no role or label.
  - ReadMoreText has no `expanded` state, and its "Read More" is title
    case in a sentence-case app.
  - The Decision's label doesn't match its visible text, which breaks
    voice control.
- **Reduced motion:** the desk's dwell trailer autoplays even when it's
  on.

### Library

- **The status chips** become a Segmented with counts; sort options
  become a menu or a 44pt control, not 17pt text links.
- **The import path goes in a circle:** You → Import → "Connect Steam
  first… go to The Plan" → a grey link under the dials. Put SteamConnect
  on the import page.

### Plan

- **Tonight is buried.** The page's comment says it opens on Tonight,
  but the verdict, two dials and the Steam link come first, so Tonight
  starts about 450pt down.
  - The dials sit 48pt from the verdict they change, then 64pt from
    Tonight.
  - Collapse them to one line under the verdict, "6h a week · whenever ·
    Adjust", that opens a sheet with both dials and the live verdict.
- **Sentences set in 10pt tracked capitals** (`plan:922, 952, 1014,
1281`). Keep eyebrows to two words or fewer and move the sentence into
  a `caption`.
- **Typed "→"** on eight links; use a chevron icon (see P0 #2).
- **HorizonStrip:**
  - Labels are 84pt wide but only stagger when they are less than 24%
    apart (about 61pt), so neighbours overlap. Measure with `onLayout`.
  - Game names are 10pt capitals; use `fine` in sentence case.
  - "+N more" appears twice on the same card with different counts.
- **"on track"** is repeated on all 12 rows. Say it once, or only when a
  row isn't on track.
- **Dead styles:** `columns`, `colLeft`, `colRight`, `panel`, `routeNote`,
  `dialVerdict`, `rowMuted` and `rowMeta`.

### Onboarding and secondary pages

- **The onboarding pick grid** has no placeholders, so the button jumps
  when six tiles arrive. Its art is 16:10, unlike the 3:4 used everywhere
  else. Picking only changes a 24pt badge. The running total uses RAWG
  `playtime` while the Plan uses `durationOf`, so the numbers can
  disagree.
- **You, signed out with no cover,** opens on a 260pt empty band. "Your
  pace" should change the pace in place rather than jump to the Plan.
- **Toasts** are never announced to screen readers
  (`announceForAccessibility`), ignore reduced motion, and hard-code
  `#1D2431`.

---

## Keep: the parts that are already top tier

- **FitStrip.** Evenings drawn at their real capacity, mint for the
  credits evening, and a proper accessible label. It's the app's
  signature; build more screens in its image.
- **The home stage.** Copy that holds still while the art pages, a
  headline that sizes to the title, publisher logos, the progress track
  and the Melt.
- **The game masthead.** It carries identity only, reserves the logo
  slot so nothing jumps, and holds the typed name until the logo lands.
- **The Decision pattern.** One amber primary until the game is saved,
  then a segmented status control.
- **Verdict copy that turns figures into a sentence,** and failure framed
  as permission ("Let go. Nothing owed.").
- **Other details worth keeping:**
  - The quest-card fallback for games with no cover.
  - Rails that bleed to the screen edge.
  - Prefetch on press-in.
  - No game repeated across rows.
  - Free evenings drawn as dashed blocks.
  - The BacklogBar's "Longest:" note.
  - HorizonStrip's idea.
- **Reduced-motion coverage** across ScaleButton, Skeleton, Reveal, the
  stage drift and the celebration.

---

## Roadmap

| Wave                     | Scope                                                                                                                                                                                                                                   | Size                        | Ships as    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ----------- |
| **0: fix the P0s**       | #2–#10 above                                                                                                                                                                                                                            | about 1–2 days              | EAS Update  |
| **1: primitives**        | `Touchable`/`IconButton` (targets, feedback, haptics, roles), `AppText` with Dynamic Type caps, `PrimaryButton`, `Sheet`, and the Toast action (Undo). Then migrate Chip, Segmented, FilterBar, tile save, header icons and BackButton. | about 1 week                | EAS Update  |
| **2: tokens and lint**   | Type scale clean-up plus `figure`, `ink`/`alpha()`/`SCRIM`, spacing and radius additions, `ICON` sizes, text colour variants, lint rules against literals                                                                               | 3–4 days, mostly mechanical | EAS Update  |
| **3: the thesis**        | Tile anatomy (hours first), game page reorder, Home above the fold (quick wins wide), colour-semantics pass, rail peek                                                                                                                  | about 1 week                | EAS Update  |
| **4: states and chrome** | Illustrated empty Plan and Library, `Message` redesign, retry everywhere, matching skeletons, scroll-aware Home header, pinned game-page title and action                                                                               | about 1 week                | EAS Update  |
| **5: native materials**  | The icon fix (#1) with dark and tinted variants, `expo-blur` plates and backdrops, tab bar glass                                                                                                                                        | 2–3 days plus a store build | Store build |

Waves 0–4 need no native changes. Wave 5 goes into the next binary.
