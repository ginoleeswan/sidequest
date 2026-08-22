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
  /**
   * `undefined` on the unpinned path (native, or reduced motion), never
   * a finished `1`. A stage that lies about being finished forces every
   * consumer to remember to treat that particular value as "no driver,
   * run your own clock" — one caller forgetting produces a reader who
   * never sees the build, only its result. Passing `undefined` instead
   * makes that the consumer's own "no driver" branch structurally, the
   * same way `MemcardBuild`'s optional `progress` prop already works.
   */
  children: (progress: Animated.Value | undefined) => React.ReactNode;
}) {
  const reduced = useReducedMotion();
  // Native has no sticky at all, and a reader who asked for less motion
  // should not be made to scroll extra screens past a section that is
  // no longer moving.
  const pinned = Platform.OS === 'web' && !reduced;

  const progress = useAnimatedValue(pinned ? 0 : 1);
  const ref = useRef<View | null>(null);

  useEffect(() => {
    if (!pinned) {
      // Reduced motion is a live subscription, not a one-time read: a
      // reader can turn it on mid-scroll, which drops us out of the
      // pinned path with whatever fractional value the last scroll
      // frame left behind. useAnimatedValue's initial argument only
      // runs once, so nothing else corrects a stale in-progress value.
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

  if (!pinned) return <View>{children(undefined)}</View>;

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
