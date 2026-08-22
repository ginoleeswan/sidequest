// src/components/ScrollStage.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, View, type ViewStyle } from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { stageProgress } from '@/lib/scrollStage';

/**
 * The whole "does this stage pin?" decision, in one place.
 *
 * `ScrollStage` needs this to decide its own layout, and `about.tsx`
 * needs the SAME answer to size the `WhenNear` placeholder it reserves
 * ahead of the (deferred-mounted) stage — a placeholder sized for the
 * pinned track when the stage is about to render unpinned (or vice
 * versa) is a CLS bug. Two call sites computing "is it pinned" by
 * separate, hand-written conditions is exactly how that drifts: this
 * repo shipped once with the placeholder checking only `reduced` while
 * this hook's `minViewport` check was the other, newer reason a stage
 * goes unpinned. Exporting one hook both call sites use removes the
 * chance of a second condition existing to disagree with.
 */
export function useStagePins(minViewport = 0): boolean {
  const reduced = useReducedMotion();
  // Native has no sticky at all, and a reader who asked for less motion
  // should not be made to scroll extra screens past a section that is
  // no longer moving. This does NOT yet decide pinning on its own — the
  // return value below also needs the viewport height, which isn't
  // known synchronously.
  const web = Platform.OS === 'web' && !reduced;

  /**
   * Held in state and updated from a resize listener, NOT read from
   * `useWindowDimensions()`. That hook's `.height` is 0 through the
   * static render and never emits again on its own — see the comment
   * above the masthead in `about.tsx`, which measured an entire hero
   * stuck at that stale value — and a stage that believed the viewport
   * was 0 tall would never pin at all.
   *
   * Starts at 0 EVEN ON THE CLIENT, and that is the important part.
   *
   * It used to initialise lazily from `window.innerHeight`, to spare
   * the stage a frame of pinning-then-unpinning on mount. That is a
   * hydration bug: the pre-rendered HTML is built with no `window`, so
   * the server says unpinned while the first client render says pinned,
   * and React tears the tree down with error #418. It went unnoticed
   * because the only consumer at the time — the memcard — sits inside
   * `WhenNear`, which starts closed on web, so its stage mounted after
   * hydration and never had a server render to disagree with. The beat
   * deck is not deferred, and it failed on `/about` immediately.
   *
   * So: first render always matches the server, and the effect below
   * supplies the real height a frame later. A stage that settles is
   * cheap; a page that fails to hydrate is not.
   */
  const [viewportHeight, setViewportHeight] = useState(0);

  // Keeps `viewportHeight` current. Deliberately keyed on `web`, not on
  // the returned "pinned" value: a caller sitting unpinned only because
  // the viewport is currently too short still has to notice the window
  // growing back past `minViewport`, or it can never re-pin. Off
  // entirely for native and reduced motion, where pinning is never on
  // the table.
  useEffect(() => {
    if (!web || typeof window === 'undefined') return;
    const onResize = () => setViewportHeight(window.innerHeight);
    onResize();
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, [web]);

  return web && viewportHeight >= minViewport;
}

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
  minViewport = 0,
  children,
}: {
  /** The track's height as a multiple of the viewport. */
  track: number;
  /**
   * The shortest viewport, in points, this stage is willing to pin
   * itself for. Below it, the stage stays unpinned even on web with
   * motion allowed.
   *
   * A pinned section is the one place clipping becomes *permanent*
   * rather than temporary: the card's height derives from its width
   * alone (`landingCardHeight`), not from the viewport, so on a short
   * enough window it no longer fits inside `STAGE`'s `100dvh` box —
   * measured live as ~75px cropped off top and bottom on a landscape
   * phone (844x390). Before this stage existed, an oversized section
   * simply scrolled past and the reader could keep scrolling to see the
   * rest of it. Pinned for `track` viewports, they can't — the section
   * holds still while the crop stays exactly the same, for the whole
   * time it's pinned. Refusing to pin below `minViewport` restores the
   * old, always-recoverable behaviour for the viewports too short to
   * hold the stage.
   */
  minViewport?: number;
  /**
   * `undefined` on the unpinned path (native, reduced motion, or a
   * viewport shorter than `minViewport`), never a finished `1`. A stage
   * that lies about being finished forces every consumer to remember to
   * treat that particular value as "no driver, run your own clock" —
   * one caller forgetting produces a reader who never sees the build,
   * only its result. Passing `undefined` instead makes that the
   * consumer's own "no driver" branch structurally, the same way
   * `MemcardBuild`'s optional `progress` prop already works.
   */
  children: (
    progress: Animated.Value | undefined,
    /**
     * Scroll the page to a fraction of this track, 0 to 1.
     *
     * A pinned section's own controls cannot move their contents: the
     * scroll position owns those, and the next frame would undo it. They
     * have to move the PAGE instead, and this is the only place that
     * knows where the track sits. `undefined` while unpinned, where a
     * consumer's ordinary controls work normally.
     */
    seek: ((fraction: number) => void) | undefined
  ) => React.ReactNode;
}) {
  const pinned = useStagePins(minViewport);

  const progress = useAnimatedValue(pinned ? 0 : 1);
  const ref = useRef<View | null>(null);

  const seek = useCallback((fraction: number) => {
    const node = ref.current as unknown as Element | null;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    if (travel <= 0) return;
    const clamped = Math.max(0, Math.min(1, fraction));
    window.scrollTo({
      top: rect.top + window.scrollY + travel * clamped,
      behavior: 'smooth',
    });
  }, []);

  useEffect(() => {
    if (!pinned) {
      // Not observable today — the unpinned render below always calls
      // `children(undefined)`, never `children(progress)`, so nothing
      // ever reads this value while unpinned. Setting it anyway is
      // belt-and-braces for a future consumer that might read `progress`
      // directly instead of going through `children`'s argument; it does
      // not fix any bug in the current one.
      progress.setValue(1);
      return;
    }
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

  if (!pinned) return <View>{children(undefined, undefined)}</View>;

  return (
    <View ref={ref} style={trackStyle(track)}>
      {/* `seek` reads `ref.current`, but only when a consumer calls it
          from a press handler — never while rendering. The rule cannot
          see that difference from the call site, and the alternative
          (mirroring the track's geometry into state so the closure has
          no ref to read) would mean re-rendering the whole stage on
          every resize to keep a number the ref already knows. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      <View style={STAGE}>{children(progress, seek)}</View>
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
  ({ height: `${Math.round(track * 100)}dvh` }) as unknown as ViewStyle;

/**
 * The two axes clip on purpose, and differently.
 *
 * `overflowY: 'clip'` is load-bearing: it is what stops an in-flight
 * cover (launched from outside the stage, per `MemcardBuild`'s own
 * comment on its fliers) from bleeding into the sections above and
 * below while it flies. That containment has to stay.
 *
 * `overflowX: 'visible'` exists because a plain `overflow: 'hidden'`
 * clips both axes together, and a rotated element's axis-aligned
 * bounding box is wider than the element itself — measured live as
 * the memcard's "ROLL CREDITS" sticker reaching 18px past the stage's
 * right edge and getting clipped by it. Splitting the two axes keeps
 * the vertical containment and lets that horizontal overhang show.
 *
 * This does not reopen the horizontal scrollbar the page works to
 * avoid: CSS only coerces `overflow-x` to `auto` when the *other* axis
 * is neither `visible` nor `clip` — `clip` on `overflow-y` avoids that
 * coercion, so `overflow-x: visible` here stays exactly `visible`,
 * verified live (0 elements spilling past the stage vertically, and no
 * horizontal page scroll).
 *
 * `STAGE` only renders on the pinned branch above, which is already
 * gated to web — no extra platform check is needed here. `clip` needs
 * Safari 16+ (2022); older Safari falls back to `hidden`'s behaviour on
 * both axes (today's clipped sticker), not to anything broken.
 *
 * `overflowX`/`overflowY` as separate properties, and the `clip` value,
 * are outside RN's `ViewStyle` type surface — cast confined here, same
 * idiom as `position: sticky` and `dvh` elsewhere in this file.
 */
const STAGE = {
  position: 'sticky',
  top: 0,
  height: '100dvh',
  overflowX: 'visible',
  overflowY: 'clip',
  justifyContent: 'center',
} as unknown as ViewStyle;
