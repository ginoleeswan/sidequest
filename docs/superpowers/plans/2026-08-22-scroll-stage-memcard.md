# ScrollStage + memcard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `ScrollStage` pinning primitive and re-drive `MemcardBuild`'s 5.4-second build animation from scroll position instead of `setTimeout`, so the showpiece plays under the reader's control instead of finishing off-screen.

**Architecture:** A track `View` sized in `dvh` holds a `position: sticky` stage. A rAF-throttled scroll listener converts the track's `getBoundingClientRect()` into a 0→1 `Animated.Value`, handed to children by render prop. `MemcardBuild` gains one 0→1 *driver* value that every flier slices its own window out of — supplied either by the stage (scroll) or by an internal timing animation (native, reduced motion). That unification deletes the `setTimeout` array entirely.

**Tech Stack:** React Native 0.86 / react-native-web, Expo SDK 57, expo-router, `Animated`, Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-08-22-scroll-stage-design.md`

## Global Constraints

- **Native has no `position: sticky`.** Every pinned path must be gated on `Platform.OS === 'web'`; native renders unpinned with the animation at its finished state. House pattern for the missing RN type: `({ position: 'sticky', top: 0 } as unknown as ViewStyle)` — see `src/components/Sidebar.tsx:162`.
- **Reduced motion takes the native path exactly** — no track height, no pin, finished state. Never leave an empty scroll track behind a static section.
- **No animated colour.** Transitions use opacity-crossfaded layers; `backgroundColor` is never interpolated.
- **Content stays in the DOM.** Nothing mounts conditionally on progress. `src/app/__tests__/content.test.tsx` must pass untouched at every task.
- **One scroll write per paint.** Scroll listeners are rAF-throttled and `passive: true`, matching `src/components/LandingWall.tsx:187-205`.
- **Progress crosses component boundaries as an `Animated.Value`, never React state.** State per scroll frame would re-render the subtree 60×/second.
- Jest runs as `Platform.OS === 'ios'`, so unit tests exercise the **fallback** path by default. Web pinning is verified in the browser, consistent with how `AppHeader`/`Sidebar` sticky code is already covered.

---

### Task 1: The progress maths

**Files:**
- Create: `src/lib/scrollStage.ts`
- Test: `src/lib/__tests__/scrollStage.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `stageProgress(top: number, trackHeight: number, viewportHeight: number): number` — `top` is the track's top edge in viewport coordinates (i.e. `getBoundingClientRect().top`). Returns 0→1.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/scrollStage.test.ts
import { stageProgress } from '../scrollStage';

describe('stageProgress', () => {
  // A 3-viewport track on an 800px window: 2400 tall, 1600 of travel.
  const TRACK = 2400;
  const VIEW = 800;

  it('is zero before the track reaches the top of the window', () => {
    expect(stageProgress(500, TRACK, VIEW)).toBe(0);
    expect(stageProgress(0, TRACK, VIEW)).toBe(0);
  });

  it('is one once the track has been scrolled through', () => {
    expect(stageProgress(-1600, TRACK, VIEW)).toBe(1);
    expect(stageProgress(-9999, TRACK, VIEW)).toBe(1);
  });

  it('runs linearly between those two', () => {
    expect(stageProgress(-800, TRACK, VIEW)).toBeCloseTo(0.5);
    expect(stageProgress(-400, TRACK, VIEW)).toBeCloseTo(0.25);
  });

  // The divide-by-zero case: a track no taller than the window has no
  // travel, so there is no meaningful progress to report.
  it('does not divide by zero when the track is not taller than the window', () => {
    expect(stageProgress(10, 800, 800)).toBe(0);
    expect(stageProgress(0, 800, 800)).toBe(1);
    expect(stageProgress(-5, 400, 800)).toBe(1);
    expect(Number.isNaN(stageProgress(0, 0, 800))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/__tests__/scrollStage.test.ts`
Expected: FAIL — `Cannot find module '../scrollStage'`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/scrollStage.ts
/**
 * How far a reader is through a pinned section, 0 to 1.
 *
 * The track is taller than the window; the stage inside it is stuck to
 * the top. Progress is therefore how much of the track's surplus height
 * has passed the top of the window — nothing to do with where the stage
 * is, which by definition never moves.
 *
 * Pure, and separated from the component, because every interesting
 * case here is an edge: a track shorter than the window has no travel
 * and would otherwise divide by zero, and both ends have to clamp or a
 * reader scrolling past the section keeps driving its animation.
 */
export function stageProgress(
  /** The track's top edge in viewport coordinates. */
  top: number,
  trackHeight: number,
  viewportHeight: number
): number {
  const travel = trackHeight - viewportHeight;
  // No surplus to scroll through: the section is either coming or done.
  if (travel <= 0) return top <= 0 ? 1 : 0;

  const scrolled = -top;
  if (scrolled <= 0) return 0;
  if (scrolled >= travel) return 1;
  return scrolled / travel;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/__tests__/scrollStage.test.ts`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/scrollStage.ts src/lib/__tests__/scrollStage.test.ts
git commit -m "Add the pinned-section progress maths"
```

---

### Task 2: The ScrollStage primitive

**Files:**
- Create: `src/components/ScrollStage.tsx`
- Test: `src/components/__tests__/ScrollStage.test.tsx`

**Interfaces:**
- Consumes: `stageProgress` from Task 1.
- Produces: `ScrollStage({ track, children })` where `track: number` is the section's height as a multiple of the viewport, and `children: (progress: Animated.Value) => React.ReactNode`. On web with motion allowed the child sees a live 0→1 value; on native or under reduced motion it sees a constant `1`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/__tests__/ScrollStage.test.tsx
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ScrollStage } from '../ScrollStage';

// Jest runs as ios, so this is the unpinned fallback path — the one
// native and reduced-motion readers get.
describe('ScrollStage without pinning', () => {
  it('renders its children rather than an empty track', () => {
    render(
      <ScrollStage track={2.6}>{() => <Text>the showpiece</Text>}</ScrollStage>
    );
    expect(screen.getByText('the showpiece')).toBeTruthy();
  });

  it('hands children a finished progress value, so nothing waits for a scroll that will never come', () => {
    let seen = -1;
    render(
      <ScrollStage track={2.6}>
        {(progress) => {
          // @ts-expect-error -- reading the private current value is the
          // only synchronous way to assert what the child was given.
          seen = progress.__getValue();
          return <Text>x</Text>;
        }}
      </ScrollStage>
    );
    expect(seen).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/__tests__/ScrollStage.test.tsx`
Expected: FAIL — `Cannot find module '../ScrollStage'`

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/ScrollStage.tsx
import { useEffect, useRef } from 'react';
import { Animated, Platform, View, type ViewStyle } from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { stageProgress } from '@/lib/scrollStage';

/**
 * A section that holds still while the reader scrolls past it.
 *
 * The track is a tall box; the stage inside it is stuck to the top of
 * the window, so scrolling the track moves the page without moving the
 * stage. What the reader's scroll drives instead is a number, which the
 * contents animate against — the device an Apple product page uses, and
 * the one an arcade attract sequence would use if it could see a mouse.
 *
 * This is NOT scroll-jacking, and the difference matters here: the
 * document is still the scroller (see the comment in `+html.tsx`, which
 * records three failed attempts at nested viewport-height scrollers on
 * iOS Safari). Nothing intercepts the wheel, so keyboard, screen
 * readers and momentum scrolling all behave exactly as they did.
 *
 * Progress leaves here as an `Animated.Value`, never as state: a state
 * update per scroll frame would re-render the whole subtree sixty times
 * a second, which is the thing the rAF throttle exists to prevent.
 */
export function ScrollStage({
  track,
  children,
}: {
  /** The track's height as a multiple of the viewport. */
  track: number;
  children: (progress: Animated.Value) => React.ReactNode;
}) {
  const reduced = useReducedMotion();
  // Native has no sticky at all, and a reader who asked for less motion
  // should not be made to scroll extra screens past a section that is
  // no longer moving.
  const pinned = Platform.OS === 'web' && !reduced;

  const progress = useAnimatedValue(pinned ? 0 : 1);
  const ref = useRef<View | null>(null);

  useEffect(() => {
    if (!pinned) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      // One write per paint: scroll fires more often than the screen
      // updates, and every extra read is a layout thrown away.
      frame = requestAnimationFrame(() => {
        frame = 0;
        const node = ref.current as unknown as Element | null;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        progress.setValue(
          stageProgress(rect.top, rect.height, window.innerHeight)
        );
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    // Resize too: the track is sized in viewport units, so its travel
    // changes when a mobile toolbar collapses.
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pinned, progress]);

  if (!pinned) return <View>{children(progress)}</View>;

  return (
    <View ref={ref} style={trackStyle(track)}>
      <View style={STAGE}>{children(progress)}</View>
    </View>
  );
}

/**
 * `dvh`, not `vh`. The dynamic unit follows a mobile browser's toolbar
 * as it collapses; `vh` does not, which is how a pinned stage ends up
 * a toolbar's height taller than the screen it is pinned to.
 *
 * Cast because viewport units are not in RN's style types — the same
 * cast `Sidebar` uses for its own `100dvh`.
 */
const trackStyle = (track: number) =>
  ({ height: `${Math.round(track * 100)}dvh` } as unknown as ViewStyle);

const STAGE = {
  position: 'sticky',
  top: 0,
  height: '100dvh',
  overflow: 'hidden',
  justifyContent: 'center',
} as unknown as ViewStyle;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/__tests__/ScrollStage.test.tsx`
Expected: PASS, 2 tests

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit` and `npx eslint src/components/ScrollStage.tsx src/lib/scrollStage.ts`
Expected: no new errors. Three pre-existing `tsc` errors are known and unrelated — `CommandPalette.tsx(63)`, `PromptBand.tsx(71)`, `SiteFooter.tsx(51)`, all the same expo-router typed-route complaint. Anything else is yours.

- [ ] **Step 6: Commit**

```bash
git add src/components/ScrollStage.tsx src/components/__tests__/ScrollStage.test.tsx
git commit -m "Add ScrollStage: a section that pins while its contents scrub"
```

---

### Task 3: The build timeline

**Files:**
- Modify: `src/components/MemcardBuild.tsx` (add an exported pure function; no behaviour change yet)
- Test: `src/components/__tests__/memcardTimeline.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces, exported from `src/components/MemcardBuild.tsx`:
  ```ts
  export interface BuildWindow { start: number; end: number }
  export function buildTimeline(count: number): { settleEnd: number; windows: BuildWindow[] }
  ```
  All values are fractions of the whole build, 0→1. `windows[i]` is when flier `i` is in flight.

Exporting a pure helper from a component file for separate testing is the existing house pattern — `api/preview.ts` exports `escapeHtml` and `previewDescription`, tested from `src/lib/__tests__/preview.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/__tests__/memcardTimeline.test.ts
import { buildTimeline } from '../MemcardBuild';

describe('buildTimeline', () => {
  it('gives every block a window, in order', () => {
    const { windows } = buildTimeline(8);
    expect(windows).toHaveLength(8);
    for (let i = 1; i < windows.length; i++) {
      expect(windows[i].start).toBeGreaterThan(windows[i - 1].start);
      expect(windows[i].end).toBeGreaterThan(windows[i - 1].end);
    }
  });

  // The card is only finished when the last cover lands, so the last
  // window has to end exactly at the end. If it ends early the stamp
  // comes down with scroll left over; if late, it never comes down.
  it('lands the last block exactly at the end of the scroll', () => {
    expect(buildTimeline(8).windows[7].end).toBeCloseTo(1);
    expect(buildTimeline(1).windows[0].end).toBeCloseTo(1);
  });

  it('settles the card before the first cover is in flight', () => {
    const { settleEnd, windows } = buildTimeline(8);
    expect(settleEnd).toBeGreaterThan(0);
    expect(settleEnd).toBeLessThanOrEqual(windows[0].start);
  });

  it('survives a card with no blocks', () => {
    const { windows, settleEnd } = buildTimeline(0);
    expect(windows).toEqual([]);
    expect(Number.isNaN(settleEnd)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/__tests__/memcardTimeline.test.ts`
Expected: FAIL — `buildTimeline is not a function`

- [ ] **Step 3: Write minimal implementation**

Add to `src/components/MemcardBuild.tsx`, directly below the existing `const SETTLE = 450;` line. Leave `FLIGHT`, `LAUNCH_EVERY` and `SETTLE` exactly as they are — they stay the source of truth for the pacing, and now describe proportions rather than milliseconds.

```ts
/** When flier `i` is in the air, as a fraction of the whole build. */
export interface BuildWindow {
  start: number;
  end: number;
}

/**
 * The build as proportions instead of milliseconds.
 *
 * The animation used to be a set of `setTimeout`s, which meant it ran
 * on a clock the reader had no say in: it fired when the section was
 * fifteen percent into view and took 5.4 seconds, so anybody scrolling
 * at a normal pace watched the stamp come down somewhere above their
 * screen. Expressed as fractions, the same pacing can be driven by
 * scroll position instead — and the timer path can drive it too, from
 * one value, so there is only one description of the sequence.
 */
export function buildTimeline(count: number): {
  settleEnd: number;
  windows: BuildWindow[];
} {
  if (count <= 0) return { settleEnd: 1, windows: [] };

  const total = SETTLE + (count - 1) * LAUNCH_EVERY + FLIGHT;
  return {
    settleEnd: SETTLE / total,
    windows: Array.from({ length: count }, (_, i) => ({
      start: (SETTLE + i * LAUNCH_EVERY) / total,
      end: (SETTLE + i * LAUNCH_EVERY + FLIGHT) / total,
    })),
  };
}

/** The whole build in milliseconds, for the un-pinned timer path. */
export function buildDuration(count: number): number {
  if (count <= 0) return 0;
  return SETTLE + (count - 1) * LAUNCH_EVERY + FLIGHT;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/__tests__/memcardTimeline.test.ts`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/components/MemcardBuild.tsx src/components/__tests__/memcardTimeline.test.ts
git commit -m "Express the memcard build as proportions, not milliseconds"
```

---

### Task 4: Drive the build from one value

**Files:**
- Modify: `src/components/MemcardBuild.tsx`
- Test: `src/components/__tests__/MemcardBuild.test.tsx` (create)

**Interfaces:**
- Consumes: `buildTimeline`, `buildDuration` from Task 3.
- Produces: `MemcardBuild` gains one optional prop, `progress?: Animated.Value`. Given one, the build is driven by it (0 = nothing landed, 1 = finished). Given none, an internal timing animation drives it exactly as before. Existing call sites keep working unchanged.

The point of this task is that **both drivers feed one value**. `Flier` stops owning its own animation and is handed a `flight` interpolation; the `setTimeout` array and the `timers` ref are deleted.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/__tests__/MemcardBuild.test.tsx
import { render, screen } from '@testing-library/react-native';
import { Animated } from 'react-native';

import { MemcardBuild } from '../MemcardBuild';
import type { Memcard } from '@/lib/memcard';

const card: Memcard = {
  year: 2025,
  count: 2,
  hours: 20,
  blocks: [
    { id: 1, name: 'A game', hours: 12, month: 0 },
    { id: 2, name: 'Another game', hours: 8, month: 4 },
  ],
  longest: { id: 1, name: 'A game', hours: 12, month: 0 },
  headline: 'Two games.',
  subhead: 'A year.',
};

const games = [
  { id: 1, name: 'A game', background_image: 'https://media.rawg.io/a.jpg' },
  { id: 2, name: 'Another game', background_image: 'https://media.rawg.io/b.jpg' },
] as never;

describe('MemcardBuild', () => {
  it('renders the card whether or not it is being scrubbed', () => {
    render(<MemcardBuild card={card} games={games} />);
    expect(screen.getByText('Two games.')).toBeTruthy();
  });

  // The whole point of the change: a caller can hand it a position
  // rather than letting it run on a clock of its own.
  it('accepts an external driver without falling over', () => {
    const progress = new Animated.Value(0);
    render(<MemcardBuild card={card} games={games} progress={progress} />);
    expect(screen.getByText('Two games.')).toBeTruthy();
    progress.setValue(1);
    expect(screen.getByText('Two games.')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/__tests__/MemcardBuild.test.tsx`
Expected: FAIL — TypeScript rejects the unknown `progress` prop.

- [ ] **Step 3: Write the implementation**

In `src/components/MemcardBuild.tsx`, replace the component body between the props destructure and the `return` with the following, and delete the now-unused `timers` ref and its `setTimeout` loop.

```tsx
export function MemcardBuild({
  card,
  games,
  maxWidth,
  progress,
}: {
  card: MemcardModel;
  games: Game[];
  maxWidth?: number;
  /**
   * Scroll position through the section, 0 to 1. Given one, the build
   * plays at the reader's pace; without one it runs on its own clock
   * once scrolled into view, which is what native and reduced-motion
   * readers get.
   */
  progress?: Animated.Value;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(maxWidth ?? 1000, windowWidth - 32);
  const height = landingCardHeight(width);

  const reduced = useReducedMotion();
  const [ref, seen] = useInView('-15%');
  const [landed, setLanded] = useState(0);

  const flights = card.blocks.map((block, index) => ({
    block,
    image: games[index]?.background_image,
  }));

  const timeline = useMemo(
    () => buildTimeline(flights.length),
    [flights.length]
  );

  // One value drives everything: the card's arrival, every flier's
  // flight, and how many blocks have landed. Either the reader's scroll
  // supplies it or the clock does, and nothing downstream can tell the
  // difference — which is the only reason the two paths cannot drift
  // apart.
  const clock = useAnimatedValue(reduced ? 1 : 0);
  const driver = progress ?? clock;

  useEffect(() => {
    if (progress || reduced || !seen) return;
    const run = Animated.timing(clock, {
      toValue: 1,
      duration: buildDuration(flights.length),
      easing: Easing.linear,
      useNativeDriver: false,
    });
    run.start();
    return () => run.stop();
    // flights.length is derived from card.blocks, stable per card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, reduced, seen, clock]);

  // `landed` has to be a number, because it is a prop on the card
  // rather than something animated. Guarded so it only re-renders on
  // the eight frames where a block actually arrives, not on all of them.
  useEffect(() => {
    if (reduced) {
      setLanded(flights.length);
      return;
    }
    const id = driver.addListener(({ value }) => {
      const count = timeline.windows.filter((w) => value >= w.end).length;
      setLanded((previous) => (previous === count ? previous : count));
    });
    return () => driver.removeListener(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver, timeline, reduced]);

  const shown = reduced ? card.blocks.length : landed;

  const settle = reduced
    ? 1
    : driver.interpolate({
        inputRange: [0, Math.max(timeline.settleEnd, 0.0001)],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });
```

Then in the JSX, the card wrapper takes `settle` as before, and each `Flier` is handed its window instead of an index:

```tsx
      {!reduced &&
        (progress ? true : seen) &&
        flights.map((flight, index) =>
          flight.image && index >= landed ? (
            <Flier
              key={flight.block.id}
              image={flight.image}
              name={flight.block.name}
              index={index}
              flight={driver.interpolate({
                inputRange: [
                  timeline.windows[index].start,
                  timeline.windows[index].end,
                ],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              })}
              slot={landingSlot(width, flight.block.month)}
              width={width}
              height={height}
            />
          ) : null
        )}
```

And `Flier` loses its own animation entirely — delete its `useAnimatedValue` and its `useEffect`, and take the value as a prop:

```tsx
function Flier({
  image,
  name,
  index,
  flight,
  slot,
  width,
  height,
}: {
  image: string;
  name: string;
  index: number;
  /** 0 launched, 1 landed — owned by the caller, not by the flier. */
  flight: Animated.AnimatedInterpolation<number>;
  slot: { x: number; y: number; w: number; h: number };
  width: number;
  height: number;
}) {
  const flierW = Math.min(Math.max(width * 0.4, 190), 300);
  // ...the rest of the body is unchanged.
```

Add `useMemo` and `Easing` to the existing imports, and import `buildDuration` is local so no import is needed.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/components/__tests__/MemcardBuild.test.tsx src/components/__tests__/memcardTimeline.test.ts`
Expected: PASS

- [ ] **Step 5: Prove nothing else regressed**

Run: `npm test`
Expected: `704 passed`, with the same 2 pre-existing failures in `src/lib/__tests__/homeFeed.test.ts` (`the daily rotation` — a date-boundary bug that predates this work). Any other failure is yours.

- [ ] **Step 6: Commit**

```bash
git add src/components/MemcardBuild.tsx src/components/__tests__/MemcardBuild.test.tsx
git commit -m "Drive the memcard build from one value instead of eight timers"
```

---

### Task 5: Pin the memcard section

**Files:**
- Modify: `src/app/about.tsx` (the memcard band, currently the `WhenNear` block containing `<Drift>` and `<MemcardBuild>`)

**Interfaces:**
- Consumes: `ScrollStage` from Task 2, `MemcardBuild`'s `progress` prop from Task 4.
- Produces: no new exports.

- [ ] **Step 1: Replace the band's stage**

In `src/app/about.tsx`, the memcard section currently wraps `MemcardBuild` in `<Drift distance={-22}>` inside a `Band`. Replace the `Drift` wrapper with a `ScrollStage`, and hand its progress to the build. `Drift` goes: it existed to give the card a little parallax as it passed, and the stage now owns every bit of the card's motion — two things moving the same object is how the showpiece ends up drifting out from under its own animation.

```tsx
            <ScrollStage track={2.6}>
              {(progress) => (
                <View style={styles.cardStage}>
                  <MemcardBuild
                    card={sampleCard(games)}
                    games={games ?? []}
                    maxWidth={scale.wide ? 1000 : 640}
                    progress={progress}
                  />
                </View>
              )}
            </ScrollStage>
```

Add `import { ScrollStage } from '@/components/ScrollStage';` to the imports. `Drift` is used exactly once on this page (`about.tsx:621`), so its import at line 25 becomes unused and must go too or lint fails — confirm with `grep -n "Drift" src/app/about.tsx` first.

The `Drift` being deleted carries `testID="memcard-drift"`. Nothing references that ID (verified: no match anywhere under `src/` or `e2e/`), so it is vestigial and takes no test with it.

- [ ] **Step 2: Check the deferred-mount placeholder still reserves the right room**

The band sits inside `<WhenNear placeholder={<View style={styles.cardRoom} />}>`, and `cardRoom` is `{ height: 460 }`. The track is now ~2.6 screens tall, so the placeholder under-reserves badly and the page will jump when the section mounts — a CLS regression the perf budget will catch.

Set the placeholder to the track's own height so the reserved room and the real room agree:

```tsx
  cardRoom: { height: '260dvh' as unknown as number },
```

- [ ] **Step 3: Verify in the browser**

```bash
npx expo start --web --port 8090
```

Then at 1440×900 and again at 390×844:
- the card holds still while the covers fly in and land, one per scroll
- the stamp comes down at the end of the section, not before
- scrolling back up runs the build backwards
- the page still reaches its footer without feeling endless

- [ ] **Step 4: Check the fallbacks**

In the browser devtools, enable **Rendering → Emulate CSS media feature prefers-reduced-motion: reduce**, reload, and confirm the section renders as a normal-height band with the card already built — no tall empty track.

- [ ] **Step 5: Run the perf budget**

```bash
npm run build && npm run test:perf
```
Expected: passes. CLS is the one at risk — if it regressed, Step 2's placeholder height is the first thing to check.

- [ ] **Step 6: Prove the page's claims still render**

Run: `npx jest src/app/__tests__/content.test.tsx`
Expected: PASS, 5 tests, untouched.

- [ ] **Step 7: Commit**

```bash
git add src/app/about.tsx
git commit -m "Pin the memcard so its build plays at the reader's pace"
```

---

## Self-Review

**Spec coverage.** `ScrollStage` primitive — Task 2. Progress maths — Task 1. Native fallback — Task 2 (`pinned` gate) and its test. Reduced motion collapsing the track — Task 2, verified Task 5 Step 4. No animated colour — not reached in step 1; no colour animates here. Content stays in DOM — Task 5 Step 6. Testing section — Tasks 1, 3 (pure maths incl. divide-by-zero), Task 2 (fallback), Task 5 (visual + perf budget). `WhenNear` placeholder risk from the spec's Risks section — Task 5 Step 2. Build order — this plan is step 1 of 3; hero and BeatDeck are out of scope by design.

**Placeholders.** None: every code step carries the actual code, and the one "check before removing" instruction names the exact grep.

**Type consistency.** `stageProgress(top, trackHeight, viewportHeight)` is defined in Task 1 and called with exactly those three in Task 2. `buildTimeline(count)` returns `{ settleEnd, windows }` in Task 3 and is destructured as both in Task 4. `BuildWindow` has `start`/`end`, used as `w.end` and `windows[index].start`/`.end` in Task 4. `Flier`'s `flight` is `Animated.AnimatedInterpolation<number>` in Task 4's signature and is passed a `driver.interpolate(...)`, which is that type. `MemcardBuild`'s `progress?: Animated.Value` in Task 4 matches what `ScrollStage` hands its render prop in Task 2.

**One risk the executor should know:** Task 4 changes `Flier` from owning its animation to receiving it. If `timeline.windows[index]` is ever undefined the interpolate call throws — it cannot be, because `windows` is built from `flights.length` and indexed by the same map, but if Task 3 and Task 4 are implemented out of order that invariant is not yet true.
