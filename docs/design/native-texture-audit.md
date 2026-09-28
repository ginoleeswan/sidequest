# Native design audit: why the phone app reads flat

_September 2026. Scope: the iOS/Android build (Home, Library, Plan, the
game page, and shared components). The web build was used for reference
only._

## The diagnosis

The layout, type scale and palette are in good shape. The phone app
reads flat for a different reason: almost every effect that gives the
web build its surface is web-only, and the one that isn't is nearly
invisible. Specifically:

1. **The grain is barely there.** `noise.png` is mid-grey specks at about
   2% average alpha (max 19%), with no dark specks. Over the navy it
   moves the page by 4–5 levels, which a phone can't show. The tile is
   also single-density. iOS stretches each speck over 3×3 device pixels
   into a haze. Android tiles at bitmap pixels, so each speck is a third
   of a point.
2. **The hero grain didn't exist on native.** `GrainScrim` returned
   `null` off the web. Every native hero ended in a clean gradient laid
   over a grainy page, so the one place the texture visibly stopped was
   the join.
3. **Surfaces had no light.** Nothing had a highlight. Panels were 3%
   white plus a hairline, and the only depth cue was `SHADOW.card`.
4. **Most of those shadows didn't render on iOS.**
   - The legacy `shadow*` props are drawn on the view's own layer.
   - Every cover tile also sets `overflow: 'hidden'`, which clips that
     layer, so no shelf had a shadow.
   - The panels' fill is 3% white, and an iOS layer shadow follows the
     fill's alpha, so it was cast by almost nothing.
5. **The start button's lamp was a slab.** The glow was an amber
   rectangle with `filter: blur(14px)`. React Native only supports that
   filter on Android, and react-native-web drops it. On iPhone (and in
   the browser) the idle "attract" pulse was a hard-edged amber plate
   breathing around the button.
6. **No ambient light.** Every page was one flat colour lit from
   nowhere, so nothing on it read as closer to the viewer than anything
   else.

## What this change does

All of it uses dependencies already in the binary (`react-native-svg`,
`expo-linear-gradient`, `@react-native-masked-view/masked-view`) plus
React Native's own `boxShadow`. There are no native module changes, so
it can ship as an EAS Update.

| Change                                                                                                 | Where                                                         | Effect                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| New `grain.png` at 1x/2x/3x, with light and dark specks                                                | `assets/images/grain*.png`, drawn by `scripts/make-grain.mjs` | Crisp, visible tooth on every native page; same 150pt tile on every density                                                                   |
| `GrainScrim` on native through a layer mask                                                            | `Textured.tsx`                                                | Heroes dissolve into the page with the texture, instead of meeting it on a clean edge                                                         |
| Lamplight: faint amber (left) and violet (right) radial pools at the top of every page                 | `Textured.tsx` (native page mode)                             | The page is lit from somewhere; the content scrolls across the light                                                                          |
| `SHADOW` tokens are now two-layer `boxShadow` (contact + ambient)                                      | `theme.ts`                                                    | Shadows render through `overflow: hidden` and under translucent fills, on both platforms                                                      |
| `MATERIAL.plate / row / edge`: a 1px inset top highlight, the shadow, and a native-only top-down sheen | `theme.ts`                                                    | One recipe for "a raised thing", applied to Plan (instrument, week panel, tonight, rows), Library backlog, WeekView and the shared month card |
| Lit top edge over cover art                                                                            | `GameTile`, `GameCard`                                        | Box art reads as an object on a shelf rather than as a picture pasted onto the page                                                           |
| Lit edge and the hero shadow on the duration sheet; the toast's shadow merged into one `boxShadow`     | `DurationSheet`, `Toast`                                      | The floating surfaces float                                                                                                                   |
| Start button lamp is an outset `boxShadow`                                                             | `ArcadeButton`                                                | A soft amber bleed on iOS and web, instead of a hard slab                                                                                     |

Web is deliberately left alone apart from the shadow tokens, which web
was already rendering as CSS `box-shadow`. The web's first rows are
tuned to match the browser chrome to the unit (`CHROME_BRIDGE`), and
both the lamplight and the stronger grain would need that re-measured.

## Verify on a device

I couldn't run a simulator from here. Typecheck, lint and all 1,367
tests pass, and React Native's iOS source
(`RCTViewComponentView.mm`, `_containerView`) confirms that `boxShadow`
renders outside an `overflow: hidden` view. The things worth checking by
eye:

- **Grain strength.** If it feels loud on an OLED iPhone, lower the
  `LIGHT`/`DARK` alphas in `scripts/make-grain.mjs` and re-run it.
- **Lamplight.** Tune the `stopOpacity` values in `Lamplight`. Amber is
  0.085 at the source and violet 0.07.
- **Android.** `boxShadow` needs API 28+. Older devices get no shadow,
  where they used to get `elevation`.

## Next, in priority order (not done here)

1. **The tab bar may be defeating Liquid Glass.** `(tabs)/_layout.tsx`
   passes `backgroundColor={COLORS.navy}`. On iOS 26 that may paint the
   glass solid; on earlier iOS it's an opaque slab.
   - Check on a device.
   - Most likely fix: drop the colour on iOS and set `blurEffect` (for
     example `systemChromeMaterialDark`) for pre-26.
2. **There's no blur material anywhere.** Plates over artwork (header
   chips, the back pill, `StatusActions`) and the sheet backdrop are flat
   translucent fills. `expo-blur` would give them real frosted glass,
   which is the single biggest "native" upgrade left. It's a new native
   module, so it needs a store build rather than an OTA update.
3. **Controls have no light yet.** `Segmented`, `StatusActions` and the
   filter chips should wear `MATERIAL.edge` on their selected segment.
   The selected library chip is solid white, the loudest object on the
   screen; an accent-tinted plate with a lit edge would rank it properly.
4. **Empty states are generic.** Library and Plan empty states are a grey
   circle with a system icon. The app already owns better material (the
   Mark on its shoreline, the quest card, the horizon). An empty state
   drawn from it would be the most "Sidequest" screen instead of the
   most template one.
5. **The page titles are quiet.** "My Library" and "The Plan" are `h1`
   in light grey. Setting them in the display face with an eyebrow in
   their semantic colour (violet for the plan, mint for finished) would
   give each tab an identity at the top.
6. **Haptics.** `expo-haptics` is installed. A light impact on save,
   status change and the arcade button's bottom-out would make the
   physical metaphors physical.
7. **The category hero fade.** `CategoryHero.fadeOut` is a CSS-only mask.
   On native the gradient bottoms out opaque under the seam, so it isn't
   visible today. Wrap the picture in `Melt` if that gradient ever
   lightens.
8. **The web grain.** The web still uses the old near-invisible tile.
   Moving it to `grain.png` is one line in `Textured`, plus re-measuring
   the chrome bridge.
