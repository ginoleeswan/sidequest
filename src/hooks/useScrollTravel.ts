import { useEffect, useRef } from 'react';
import { Animated, Platform, type View } from 'react-native';

import { useAnimatedValue } from './useAnimatedValue';
import { useReducedMotion } from './useReducedMotion';

/**
 * One scroll listener for the whole page.
 *
 * Every scrubbed element needs the same fact — where the page is — and
 * a listener each would mean a dozen handlers competing to schedule the
 * same frame. This installs one, and fans it out to whoever is
 * measuring. Reads all happen inside a single animation frame, before
 * any of the writes, so the browser lays out once rather than once per
 * subscriber.
 */
type Measure = () => void;
const measurers = new Set<Measure>();
let frame = 0;
let listening = false;

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    for (const measure of measurers) measure();
  });
}

function subscribe(measure: Measure) {
  measurers.add(measure);
  if (!listening) {
    listening = true;
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
  }
  schedule();
  return () => {
    measurers.delete(measure);
    if (measurers.size === 0) {
      listening = false;
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}

/**
 * How far an element has travelled across the viewport, 0 to 1.
 *
 * Scrubbed, not triggered — and that distinction is the whole point of
 * this file. A reveal fires once when a thing is reached and then the
 * page is a document again; the reader learns after two sections that
 * arriving is all anything does here, and stops seeing it. Motion tied
 * to scroll position never finishes: it answers the reader continuously,
 * in both directions, at whatever speed they choose. It is the single
 * biggest difference between a page that animates and a page that feels
 * alive.
 *
 * Zero when the element's top is at the bottom of the viewport, one when
 * its bottom has passed the top. Sits at 0.5 — the neutral middle — on
 * native, and when somebody has asked for less motion, so callers can
 * interpolate unconditionally and get no offset at all.
 */
export function useScrollTravel(): [
  React.RefObject<View | null>,
  Animated.Value,
] {
  const ref = useRef<View | null>(null);
  const travel = useAnimatedValue(0.5);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (Platform.OS !== 'web' || reduced) return;

    return subscribe(() => {
      const node = ref.current as unknown as Element | null;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const span = window.innerHeight + rect.height;
      if (span <= 0) return;
      const progress = (window.innerHeight - rect.top) / span;
      travel.setValue(Math.min(Math.max(progress, 0), 1));
    });
  }, [travel, reduced]);

  return [ref, travel];
}

/**
 * A scrubbed translation, in points, either side of neutral.
 *
 * Positive `distance` means the thing lags the page on the way up,
 * which is what reads as depth; negative means it leads.
 */
export function drift(travel: Animated.Value, distance: number) {
  return travel.interpolate({
    inputRange: [0, 1],
    outputRange: [distance, -distance],
  });
}
