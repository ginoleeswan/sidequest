import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Whether the user has asked the system for less animation.
 *
 * Respecting this is not a nicety: for people with vestibular disorders,
 * movement they did not ask for causes real symptoms. Everywhere this
 * returns true the app should still change state — it just arrives
 * instead of travelling.
 *
 * Modelled as an external store rather than effect-driven state, because
 * that is what it is: the value lives in the OS, can change while the app
 * is open, and must have a synchronous answer during the very first
 * render, before any animation has had a chance to start.
 */

const QUERY = '(prefers-reduced-motion: reduce)';

/** Native's API is async, so the last known answer is cached here. */
let nativeValue = false;

function subscribe(onChange: () => void): () => void {
  if (Platform.OS === 'web') {
    // Guard: older Safari exposes matchMedia without addEventListener.
    const query = globalThis.matchMedia?.(QUERY);
    query?.addEventListener?.('change', onChange);
    return () => query?.removeEventListener?.('change', onChange);
  }

  let alive = true;
  AccessibilityInfo.isReduceMotionEnabled().then((value) => {
    if (!alive || value === nativeValue) return;
    nativeValue = value;
    onChange();
  });
  const listener = AccessibilityInfo.addEventListener(
    'reduceMotionChanged',
    (value) => {
      nativeValue = value;
      onChange();
    }
  );
  return () => {
    alive = false;
    listener.remove();
  };
}

function getSnapshot(): boolean {
  if (Platform.OS !== 'web') return nativeValue;
  return globalThis.matchMedia?.(QUERY).matches ?? false;
}

/** The static export has no user to ask; assume motion is welcome. */
const getServerSnapshot = () => false;

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
