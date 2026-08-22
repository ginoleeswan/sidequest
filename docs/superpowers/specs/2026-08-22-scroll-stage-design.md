# Pinned scroll stages for the landing page

**Date:** 2026-08-22
**Status:** approved, not yet implemented

## The idea

Sections of `/about` hold still while the reader scrolls, and their
contents animate against scroll position instead of against a clock —
the device Apple product pages and the Phantom wallet landing page use.
The page becomes a scrollable slideshow rather than a document that
happens to move.

Three sections get it, in this order: the memcard showpiece, the hero
and its pile, and the three beats. `LandingTry` is explicitly deferred
— it is interactive, and pinning an interactive panel puts the reader's
scroll and the reader's clicking in competition for one gesture. That
decision gets revisited after the other three ship, not before.

## Why this is cheap here

Both halves already exist in the repo and are proven:

- **Pinning.** `position: sticky` is used in four places today, with a
  house pattern for RN's missing types — `({ position: 'sticky', top: 0
  } as unknown as ViewStyle)`. `Sidebar.tsx:162` already pins at
  `height: '100dvh'`, which is the unit that avoids the iOS Safari
  viewport-unit problem.
- **Scrubbing.** `LandingWall` already maps `window.scrollY` to an
  `Animated.Value` and interpolates from it, rAF-throttled to one write
  per paint. `BeatDeck` and `QuestLine` do the same.

It also does not fight the architecture. `+html.tsx:148` carries an
all-caps comment — THE DOCUMENT IS THE SCROLLER — recording three
failed attempts at nested viewport-height scroll containers on iOS
Safari. Sticky positioning is not a nested scroller: the document keeps
scrolling and the stage holds still within it. What that comment does
rule out is true scroll-jacking, which is also the variant that breaks
keyboard navigation, screen readers and mobile.

## Architecture

One primitive, `src/components/ScrollStage.tsx`, used by all three
sections so the fallbacks are written once.

```
<ScrollStage track={2.8}>
  {(progress) => <Stuff progress={progress} />}
</ScrollStage>
```

**Structure.** An outer *track* `View` with `height: ${track * 100}dvh`,
containing an inner *stage* `View` at `position: sticky; top: 0; height:
100dvh; overflow: hidden`. The reader scrolls the track; the stage stays.

**Progress.** On each scroll frame (rAF-throttled, one write per paint,
copying `LandingWall`'s existing loop) the track's
`getBoundingClientRect()` gives `progress = clamp(-top / (trackHeight -
viewportHeight), 0, 1)`. Written into an `Animated.Value` via
`setValue`, handed to children as a render-prop argument.

Children receive an `Animated.Value`, never a React state number — a
state update per scroll frame would re-render the subtree sixty times a
second, which is the thing the existing rAF discipline exists to avoid.

**Composition.** `track` is a multiplier on viewport height, so a
section's scroll cost is stated in screens at its call site and is
legible next to the other sections' costs.

## Constraints that shape it

### Native has no sticky

The app ships to iOS and Android through Expo. `position: sticky` is
web-only, so `ScrollStage` must render as an ordinary section on
native: no track height, no pin, children mounted at their finished
state (`progress` pinned to 1). This is not a nice-to-have — it is half
the component. Gate on `Platform.OS === 'web'`, the same way
`AppHeader` and `Sidebar` already gate their sticky casts.

### Reduced motion

Under `prefers-reduced-motion: reduce`, take the native path exactly:
no track, no pin, finished state. A reader who has asked for less
movement should not also be made to scroll three extra screens past a
section that is no longer animating. `useReducedMotion` already returns
a synchronous first-render answer, so this costs nothing.

### No animated colour

Background transitions are done as opacity-crossfaded solid layers, not
by interpolating `backgroundColor`. Animating colour forces a JS-driven
per-frame repaint; opacity stays on the native driver. This matches the
discipline already written down in `ArcadeButton` and `LandingWall`.

### Content stays in the DOM

Crawlers do not scroll. Everything a pinned section says must be real
text present at mount, animated only in its presentation — never
mounted conditionally on progress. `content.test.tsx` already asserts
the page's claims render; those assertions must keep passing unchanged,
which is the cheapest possible guard on this.

## Build order

1. **`ScrollStage` + the memcard.** `MemcardBuild`'s build animation
   already exists; today it fires once on scroll-into-view and can play
   to an empty room if the reader scrolls past. Re-driving it from
   `progress` is the cheapest proof the primitive works, and fixes a
   real defect rather than only adding polish.
2. **The hero and the pile.** `LandingWall` already scrubs on scroll
   with a `FADE_DISTANCE` of 280 — replace that ad-hoc listener with
   the stage's progress so the pile fully goes out and the three
   survivors land before the page moves on.
3. **The three beats.** `BeatDeck` becomes a scroll-driven sequence:
   panels spreading from centre, ground crossfading per beat. The most
   new animation to author, so it goes last.

Each step ships on its own and is judged on its own before the next
starts.

## Testing

- **Unit.** The progress maths is a pure function of rect and viewport
  height — extract and test it directly (before the track, inside it,
  past it, and a track shorter than the viewport, which must not divide
  by zero).
- **Fallbacks.** `ScrollStage` renders children at finished state when
  `Platform.OS !== 'web'` and when reduced motion is set. Jest's preset
  is native, so the default test render already exercises the native
  path.
- **Content.** `content.test.tsx` must pass untouched at every step.
- **Visual.** Check each section at 1440x900 and 390x844 in the browser,
  and confirm the page still reaches its footer in a reasonable scroll.
- **Budget.** `npm run test:perf` has byte/FCP/LCP/CLS budgets. Pinned
  sections are a CLS risk in particular; run it after each step rather
  than at the end.

## Risks

- **Page length.** Three pinned sections cost roughly 8 screens of
  scrolling on top of the five bands that stay normal. This is the
  failure mode of over-Appled sites. Mitigation: `track` is a number at
  the call site, tuned per section, and step 1 ships alone so the cost
  is felt before it is tripled.
- **Mobile.** `dvh` moves as browser toolbars collapse. `Sidebar`
  already relies on `dvh` successfully, but pinned stages are more
  sensitive; verify on a real iOS Safari before step 2.
- **Deferred sections.** `WhenNear` defers several bands until scrolled
  near. A pinned track changes when "near" happens; check the
  placeholder heights still reserve correctly so nothing jumps.

## Out of scope

- `LandingTry` — deferred by decision, revisited after step 3.
- CSS scroll-driven animations (`animation-timeline: scroll()`). Zero
  JS and better performance, but inexpressible through RN `StyleSheet`,
  so it would split the landing page's styling across two systems. A
  candidate progressive enhancement later, not the foundation.
- Scroll-jacking or snap-to-section. Ruled out by the document-is-the-
  scroller decision and by accessibility.
